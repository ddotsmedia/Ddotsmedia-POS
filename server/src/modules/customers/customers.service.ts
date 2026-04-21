import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async getCustomers(tenantId: string, search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {
      tenantId,
      ...(search && { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }, { email: { contains: search, mode: 'insensitive' } }] }),
    };
    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.customer.count({ where }),
    ]);
    return { data: customers, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getCustomer(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        sales: { orderBy: { createdAt: 'desc' }, take: 10, include: { items: true, payments: true } },
        loyaltyLedger: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async createCustomer(data: any, tenantId: string) {
    return this.prisma.customer.create({ data: { ...data, tenantId } });
  }

  async updateCustomer(id: string, data: any) {
    return this.prisma.customer.update({ where: { id }, data });
  }

  async getLoyalty(customerId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId }, select: { loyaltyPoints: true, totalSpent: true, visitCount: true } });
    if (!customer) throw new NotFoundException('Customer not found');
    const ledger = await this.prisma.loyaltyLedger.findMany({ where: { customerId }, orderBy: { createdAt: 'desc' }, take: 20 });
    return { ...customer, ledger };
  }

  async redeemPoints(customerId: string, points: number) {
    const customer = await this.prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');
    if (customer.loyaltyPoints < points) throw new NotFoundException('Insufficient loyalty points');

    await this.prisma.$transaction([
      this.prisma.customer.update({ where: { id: customerId }, data: { loyaltyPoints: { decrement: points } } }),
      this.prisma.loyaltyLedger.create({
        data: { customerId, action: 'REDEEMED', points: -points, balanceBefore: customer.loyaltyPoints, balanceAfter: customer.loyaltyPoints - points },
      }),
    ]);
    return { success: true, remainingPoints: customer.loyaltyPoints - points };
  }
}
