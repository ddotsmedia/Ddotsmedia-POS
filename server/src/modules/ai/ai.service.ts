import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private _openai: OpenAI | null = null;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  private get openai(): OpenAI {
    if (!this._openai) {
      const key = this.config.get<string>('OPENAI_API_KEY');
      if (!key || key.startsWith('sk-your')) {
        throw new Error('OPENAI_API_KEY is not configured. Add your key to .env to enable AI features.');
      }
      this._openai = new OpenAI({ apiKey: key });
    }
    return this._openai;
  }

  private async safeAiCall<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch (e: any) {
      if (e.message?.includes('OPENAI_API_KEY')) {
        this.logger.warn('OpenAI not configured — returning mock data');
        return fallback;
      }
      throw e;
    }
  }

  // ── Natural Language → SQL Query ─────────────────────────────────────────
  async naturalLanguageQuery(question: string, tenantId: string) {
    const schemaContext = `
      Tables: sales(id, branchId, cashierId, total, taxAmount, discountAmount, createdAt, status),
      sale_items(saleId, productId, name, quantity, unitPrice, total),
      products(id, name, categoryId, sellingPrice, costPrice),
      inventory(productId, branchId, quantity),
      customers(id, name, totalSpent, visitCount, loyaltyPoints),
      branches(id, name)
      All queries must filter by tenantId = '${tenantId}'
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a SQL expert for a POS system. Convert natural language questions into PostgreSQL queries.
          Return ONLY valid JSON: { "sql": "SELECT ...", "description": "What this query returns" }
          Always include WHERE tenantId = '${tenantId}' for data isolation.
          Never include DROP, DELETE, UPDATE, INSERT, ALTER or any mutating operations.
          Database schema: ${schemaContext}`,
        },
        { role: 'user', content: question },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    if (!result.sql || /drop|delete|update|insert|alter|truncate/i.test(result.sql)) {
      throw new Error('Invalid or unsafe query generated');
    }

    try {
      const data = await this.prisma.$queryRawUnsafe(result.sql);
      return { question, description: result.description, data };
    } catch (error) {
      this.logger.error('NLQ execution failed', error);
      throw new Error('Could not execute query');
    }
  }

  // ── Demand Forecasting ────────────────────────────────────────────────────
  async forecastDemand(productId: string, days = 30) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const salesHistory = await this.prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        productId,
        sale: { createdAt: { gte: thirtyDaysAgo }, status: 'COMPLETED' },
      },
      _sum: { quantity: true },
    });

    const totalSold = salesHistory[0]?._sum.quantity ?? 0;
    const avgPerDay = totalSold / 30;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an inventory forecasting AI. Given sales data, predict future demand.
          Return JSON: { "forecast": number, "confidence": "low|medium|high", "reasoning": string, "reorderRecommended": boolean }`,
        },
        {
          role: 'user',
          content: `Product sold ${totalSold} units in last 30 days (avg ${avgPerDay.toFixed(2)}/day). Forecast demand for next ${days} days.`,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const forecast = JSON.parse(response.choices[0].message.content || '{}');
    return {
      productId,
      historicalSales: totalSold,
      avgPerDay: parseFloat(avgPerDay.toFixed(2)),
      forecastedDays: days,
      ...forecast,
    };
  }

  // ── Anomaly Detection ─────────────────────────────────────────────────────
  async detectAnomalies(tenantId: string, branchId?: string) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentSales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        ...(branchId && { branchId }),
        createdAt: { gte: oneDayAgo },
        status: 'COMPLETED',
      },
      include: { items: true, payments: true, cashier: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const anomalies = recentSales.filter((sale) => {
      const hasLargeDiscount = sale.discountAmount > sale.subtotal * 0.3;
      const isLargeTransaction = sale.total > 5000;
      const hasVoidedItems = sale.status === 'VOIDED';
      return hasLargeDiscount || (isLargeTransaction && !sale.customerId) || hasVoidedItems;
    });

    if (anomalies.length === 0) return { anomalies: [], summary: 'No anomalies detected' };

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a fraud detection AI for a retail POS. Analyze transactions and identify suspicious patterns. Return JSON: { "riskLevel": "low|medium|high", "findings": string[], "recommendations": string[] }',
        },
        {
          role: 'user',
          content: `Analyze these ${anomalies.length} flagged transactions: ${JSON.stringify(anomalies.map((s) => ({ id: s.id, total: s.total, discount: s.discountAmount, cashier: s.cashier.name, paymentMethods: s.payments.map((p) => p.method) })))}`,
        },
      ],
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    return { anomalies: anomalies.map((s) => s.id), count: anomalies.length, ...analysis };
  }

  // ── AI Daily Summary ──────────────────────────────────────────────────────
  async generateDailySummary(tenantId: string, branchId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const [todaySales, yesterdaySales, topProducts] = await Promise.all([
      this.prisma.sale.aggregate({
        where: { tenantId, ...(branchId && { branchId }), createdAt: { gte: today }, status: 'COMPLETED' },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.sale.aggregate({
        where: { tenantId, ...(branchId && { branchId }), createdAt: { gte: yesterday, lt: today }, status: 'COMPLETED' },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.saleItem.groupBy({
        by: ['name'],
        where: { sale: { tenantId, ...(branchId && { branchId }), createdAt: { gte: today }, status: 'COMPLETED' } },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
    ]);

    const todayRevenue = Number(todaySales._sum.total ?? 0);
    const yesterdayRevenue = Number(yesterdaySales._sum.total ?? 0);
    const change = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;

    const aiSummary = await this.safeAiCall(async () => {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a retail business analyst. Generate a concise, insightful daily sales summary in 2-3 sentences. Be specific and actionable.' },
          { role: 'user', content: `Today: ${todaySales._count} sales, AED ${todayRevenue.toFixed(2)} revenue. Yesterday: ${yesterdaySales._count} sales, AED ${yesterdayRevenue.toFixed(2)}. Change: ${change.toFixed(1)}%. Top products: ${topProducts.map((p) => `${p.name} (AED ${p._sum.total?.toFixed(0)})`).join(', ')}` },
        ],
        temperature: 0.5,
      });
      return response.choices[0].message.content;
    }, `Today's revenue: AED ${todayRevenue.toFixed(2)} from ${todaySales._count} transactions. Add your OPENAI_API_KEY to .env for AI-generated insights.`);

    return {
      date: today.toISOString().slice(0, 10),
      todayRevenue,
      todayTransactions: todaySales._count,
      changePercent: parseFloat(change.toFixed(1)),
      topProducts,
      aiSummary,
    };
  }

  // ── Product Recommendations ───────────────────────────────────────────────
  async getProductRecommendations(productId: string, tenantId: string) {
    const coSales = await this.prisma.saleItem.findMany({
      where: {
        sale: {
          tenantId,
          status: 'COMPLETED',
          items: { some: { productId } },
        },
        productId: { not: productId },
      },
      select: { productId: true, product: { select: { name: true } } },
      take: 200,
    });

    const frequency: Record<string, { name: string; count: number }> = {};
    for (const item of coSales) {
      if (!frequency[item.productId]) {
        frequency[item.productId] = { name: item.product.name, count: 0 };
      }
      frequency[item.productId].count++;
    }

    const sorted = Object.entries(frequency)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([id, data]) => ({ productId: id, name: data.name, coSaleCount: data.count }));

    return { basedOnProduct: productId, recommendations: sorted };
  }

  // ── AI Chat Support ───────────────────────────────────────────────────────
  async chat(messages: { role: 'user' | 'assistant'; content: string }[]) {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a helpful POS system support assistant. Help users with: using the POS terminal, managing inventory, running reports, and troubleshooting. Be concise and practical. If you don't know something specific to this system, say so.`,
        },
        ...messages,
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    return { reply: response.choices[0].message.content };
  }
}
