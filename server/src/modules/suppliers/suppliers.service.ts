import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async getSuppliers(tenantId: string, search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {
      tenantId,
      isActive: true,
      ...(search && { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }),
    };
    const [suppliers, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: { _count: { select: { purchaseOrders: true } } },
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return { data: suppliers, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getSupplier(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { items: true },
        },
      },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async createSupplier(data: any, tenantId: string) {
    return this.prisma.supplier.create({ data: { ...data, tenantId } });
  }

  async updateSupplier(id: string, data: any) {
    return this.prisma.supplier.update({ where: { id }, data });
  }

  async deactivateSupplier(id: string) {
    return this.prisma.supplier.update({ where: { id }, data: { isActive: false } });
  }
}
