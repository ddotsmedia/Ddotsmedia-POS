import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesSummary(tenantId: string, from: string, to: string, branchId?: string) {
    const where: any = {
      tenantId, status: 'COMPLETED',
      createdAt: { gte: new Date(from), lte: new Date(to) },
      ...(branchId && { branchId }),
    };

    const [totals, byDay, topProducts, topCashiers] = await Promise.all([
      this.prisma.sale.aggregate({ where, _sum: { total: true, taxAmount: true, discountAmount: true }, _count: true, _avg: { total: true } }),

      branchId
        ? this.prisma.$queryRaw<any[]>`
            SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total) as revenue
            FROM "Sale" WHERE tenant_id = ${tenantId} AND status = 'COMPLETED'
              AND created_at >= ${new Date(from)} AND created_at <= ${new Date(to)}
              AND branch_id = ${branchId}
            GROUP BY DATE(created_at) ORDER BY date ASC
          `
        : this.prisma.$queryRaw<any[]>`
            SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total) as revenue
            FROM "Sale" WHERE tenant_id = ${tenantId} AND status = 'COMPLETED'
              AND created_at >= ${new Date(from)} AND created_at <= ${new Date(to)}
            GROUP BY DATE(created_at) ORDER BY date ASC
          `,

      this.prisma.saleItem.groupBy({
        by: ['name'],
        where: { sale: where },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10,
      }),

      this.prisma.sale.groupBy({
        by: ['cashierId'],
        where,
        _sum: { total: true },
        _count: true,
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
    ]);

    const cashierDetails = await Promise.all(
      topCashiers.map(async (c) => {
        const user = await this.prisma.user.findUnique({ where: { id: c.cashierId }, select: { name: true } });
        return { cashier: user?.name ?? 'Unknown', sales: c._count, revenue: c._sum.total };
      }),
    );

    return {
      period: { from, to },
      summary: { totalRevenue: totals._sum.total ?? 0, totalTax: totals._sum.taxAmount ?? 0, totalDiscount: totals._sum.discountAmount ?? 0, totalTransactions: totals._count, avgTransactionValue: totals._avg.total ?? 0 },
      byDay,
      topProducts: topProducts.map((p) => ({ name: p.name, quantity: p._sum.quantity, revenue: p._sum.total })),
      topCashiers: cashierDetails,
    };
  }

  async getProfitLoss(tenantId: string, from: string, to: string, branchId?: string) {
    const where: any = {
      tenantId, status: 'COMPLETED',
      createdAt: { gte: new Date(from), lte: new Date(to) },
      ...(branchId && { branchId }),
    };

    const items = await this.prisma.saleItem.findMany({
      where: { sale: where },
      select: { quantity: true, unitPrice: true, costPrice: true, total: true, discount: true, name: true },
    });

    const revenue = items.reduce((s, i) => s + i.total, 0);
    const cogs = items.reduce((s, i) => s + i.costPrice * i.quantity, 0);
    const grossProfit = revenue - cogs;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    const byProduct = Object.values(
      items.reduce((acc: Record<string, any>, i) => {
        if (!acc[i.name]) acc[i.name] = { name: i.name, revenue: 0, cogs: 0, profit: 0, qty: 0 };
        acc[i.name].revenue += i.total;
        acc[i.name].cogs += i.costPrice * i.quantity;
        acc[i.name].profit += i.total - i.costPrice * i.quantity;
        acc[i.name].qty += i.quantity;
        return acc;
      }, {}),
    ).sort((a: any, b: any) => b.profit - a.profit).slice(0, 20);

    return { period: { from, to }, revenue, cogs, grossProfit, grossMargin: parseFloat(grossMargin.toFixed(2)), byProduct };
  }

  async getCashierReport(tenantId: string, from: string, to: string, branchId?: string) {
    const where: any = {
      tenantId, status: 'COMPLETED',
      createdAt: { gte: new Date(from), lte: new Date(to) },
      ...(branchId && { branchId }),
    };

    const grouped = await this.prisma.sale.groupBy({
      by: ['cashierId'],
      where,
      _sum: { total: true, discountAmount: true },
      _count: true,
    });

    return Promise.all(grouped.map(async (g) => {
      const user = await this.prisma.user.findUnique({ where: { id: g.cashierId }, select: { name: true } });
      return { cashier: user?.name ?? 'Unknown', cashierId: g.cashierId, transactions: g._count, totalRevenue: g._sum.total ?? 0, totalDiscount: g._sum.discountAmount ?? 0 };
    }));
  }

  async exportCsv(tenantId: string, type: string, from: string, to: string, branchId?: string): Promise<string> {
    const toCsv = (rows: any[], cols: string[]) => {
      const header = cols.join(',');
      const lines = rows.map((r) => cols.map((c) => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','));
      return [header, ...lines].join('\n');
    };

    if (type === 'sales') {
      const data = await this.getSalesSummary(tenantId, from, to, branchId);
      return toCsv(data.topProducts, ['name', 'quantity', 'revenue']);
    }
    if (type === 'profit') {
      const data = await this.getProfitLoss(tenantId, from, to, branchId);
      return toCsv(data.byProduct, ['name', 'qty', 'revenue', 'cogs', 'profit']);
    }
    if (type === 'cashier') {
      const data = await this.getCashierReport(tenantId, from, to, branchId);
      return toCsv(data, ['cashier', 'transactions', 'totalRevenue', 'totalDiscount']);
    }
    if (type === 'inventory') {
      const data = await this.getInventoryReport(tenantId, branchId);
      return toCsv(data.items, ['product', 'barcode', 'branch', 'quantity', 'costPrice', 'sellingPrice', 'stockValue', 'isLowStock']);
    }
    return 'no data';
  }

  async getInventoryReport(tenantId: string, branchId?: string) {
    const inventory = await this.prisma.inventory.findMany({
      where: { product: { tenantId }, ...(branchId && { branchId }) },
      include: { product: { select: { name: true, barcode: true, sellingPrice: true, costPrice: true, minStockAlert: true } }, branch: { select: { name: true } } },
    });

    const totalValue = inventory.reduce((s, i) => s + i.quantity * i.product.costPrice, 0);
    const totalRetailValue = inventory.reduce((s, i) => s + i.quantity * i.product.sellingPrice, 0);
    const lowStock = inventory.filter((i) => i.quantity <= (i.product.minStockAlert ?? 10));

    return {
      totalItems: inventory.length, totalStockValue: totalValue, totalRetailValue,
      lowStockCount: lowStock.length, lowStockItems: lowStock,
      items: inventory.map((i) => ({
        product: i.product.name, barcode: i.product.barcode, branch: i.branch.name,
        quantity: i.quantity, costPrice: i.product.costPrice, sellingPrice: i.product.sellingPrice,
        stockValue: i.quantity * i.product.costPrice, isLowStock: i.quantity <= (i.product.minStockAlert ?? 10),
      })),
    };
  }
}
