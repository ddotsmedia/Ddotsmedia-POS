import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats(tenantId: string) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [totalUsers, totalProducts, todaySales, totalCustomers, lowStock] = await Promise.all([
      this.prisma.user.count({ where: { tenantId, isActive: true } }),
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
      this.prisma.sale.aggregate({ where: { tenantId, status: 'COMPLETED', createdAt: { gte: today } }, _sum: { total: true }, _count: true }),
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.inventory.count({ where: { product: { tenantId }, quantity: { lte: 10 } } }),
    ]);
    return { totalUsers, totalProducts, todayRevenue: todaySales._sum.total ?? 0, todayTransactions: todaySales._count, totalCustomers, lowStockAlerts: lowStock };
  }

  async getUsers(tenantId: string) {
    return this.prisma.user.findMany({ where: { tenantId }, select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, branch: { select: { name: true } } }, orderBy: { name: 'asc' } });
  }

  async createUser(data: any, tenantId: string) {
    const bcrypt = await import('bcrypt');
    return this.prisma.user.create({
      data: { ...data, tenantId, passwordHash: await bcrypt.hash(data.password, 12) },
    });
  }

  async updateUserRole(id: string, role: string) {
    return this.prisma.user.update({ where: { id }, data: { role: role as any } });
  }

  async toggleUser(id: string, isActive: boolean) {
    return this.prisma.user.update({ where: { id }, data: { isActive } });
  }

  async getAuditLogs(tenantId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where: { tenantId }, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } } } }),
      this.prisma.auditLog.count({ where: { tenantId } }),
    ]);
    return { data: logs, total, page, limit };
  }
}
