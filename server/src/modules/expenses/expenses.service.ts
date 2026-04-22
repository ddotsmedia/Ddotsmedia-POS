import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async getExpenses(tenantId: string, branchId?: string, from?: string, to?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {
      tenantId,
      ...(branchId && { branchId }),
      ...(from || to
        ? {
            expenseDate: {
              ...(from && { gte: new Date(from) }),
              ...(to && { lte: new Date(to) }),
            },
          }
        : {}),
    };
    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { expenseDate: 'desc' },
        include: { branch: { select: { name: true } } },
      }),
      this.prisma.expense.count({ where }),
    ]);

    const summary = await this.prisma.expense.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
    });

    return { data: expenses, total, page, limit, pages: Math.ceil(total / limit), summary };
  }

  async createExpense(data: any, tenantId: string, createdBy: string) {
    return this.prisma.expense.create({
      data: { ...data, tenantId, createdBy, expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date() },
    });
  }

  async updateExpense(id: string, data: any) {
    return this.prisma.expense.update({ where: { id }, data });
  }

  async deleteExpense(id: string) {
    return this.prisma.expense.delete({ where: { id } });
  }

  async getExpenseSummary(tenantId: string, branchId?: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const where: any = { tenantId, ...(branchId && { branchId }), expenseDate: { gte: startOfMonth } };

    const [total, byCategory] = await Promise.all([
      this.prisma.expense.aggregate({ where, _sum: { amount: true } }),
      this.prisma.expense.groupBy({ by: ['category'], where, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } } }),
    ]);

    return { totalThisMonth: total._sum.amount ?? 0, byCategory };
  }
}
