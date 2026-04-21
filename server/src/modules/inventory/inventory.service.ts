import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getInventory(tenantId: string, branchId?: string) {
    return this.prisma.inventory.findMany({
      where: { product: { tenantId }, ...(branchId && { branchId }) },
      include: {
        product: { select: { id: true, name: true, barcode: true, sku: true, minStockAlert: true, category: { select: { name: true } } } },
        branch: { select: { name: true } },
      },
      orderBy: { product: { name: 'asc' } },
    });
  }

  async getLowStock(tenantId: string, branchId?: string) {
    const inventory = await this.prisma.inventory.findMany({
      where: { product: { tenantId }, ...(branchId && { branchId }) },
      include: { product: { select: { id: true, name: true, barcode: true, minStockAlert: true } }, branch: { select: { name: true } } },
    });
    return inventory.filter((i) => i.quantity <= (i.product.minStockAlert ?? 10));
  }

  async adjustStock(productId: string, branchId: string, quantityDelta: number, note: string, userId: string) {
    const inv = await this.prisma.inventory.findFirst({ where: { productId, branchId } });
    if (!inv) throw new NotFoundException('Inventory record not found');

    const updated = await this.prisma.inventory.update({
      where: { id: inv.id },
      data: { quantity: { increment: quantityDelta } },
    });

    await this.prisma.stockMovement.create({
      data: {
        inventoryId: inv.id, type: 'ADJUSTMENT', quantity: quantityDelta,
        balanceBefore: inv.quantity, balanceAfter: inv.quantity + quantityDelta,
        note, createdBy: userId,
      },
    });

    return updated;
  }

  async transferStock(fromBranchId: string, toBranchId: string, productId: string, quantity: number, userId: string) {
    const fromInv = await this.prisma.inventory.findFirst({ where: { productId, branchId: fromBranchId } });
    if (!fromInv || fromInv.quantity < quantity) throw new NotFoundException('Insufficient stock for transfer');

    await this.prisma.$transaction([
      this.prisma.inventory.update({ where: { id: fromInv.id }, data: { quantity: { decrement: quantity } } }),
      this.prisma.inventory.upsert({
        where: { id: `${productId}-${toBranchId}` },
        update: { quantity: { increment: quantity } },
        create: { productId, branchId: toBranchId, quantity },
      }),
      this.prisma.stockTransfer.create({
        data: { fromBranchId, toBranchId, productId, quantity, createdBy: userId },
      }),
    ]);

    return { success: true, transferred: quantity };
  }

  // Products
  async getProducts(tenantId: string, search?: string, categoryId?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where: any = {
      tenantId, isActive: true,
      ...(categoryId && { categoryId }),
      ...(search && { OR: [{ name: { contains: search, mode: 'insensitive' } }, { barcode: { contains: search } }, { sku: { contains: search, mode: 'insensitive' } }] }),
    };
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where, skip, take: limit, orderBy: { name: 'asc' },
        include: { category: { select: { name: true, icon: true } }, inventory: true },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data: products, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getProductByBarcode(barcode: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { barcode, tenantId, isActive: true },
      include: { category: { select: { name: true } }, inventory: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async createProduct(data: any, tenantId: string) {
    return this.prisma.product.create({
      data: { ...data, tenantId, slug: data.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now() },
    });
  }

  async updateProduct(id: string, data: any) {
    return this.prisma.product.update({ where: { id }, data });
  }

  async getCategories(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
  }

  async createCategory(data: any, tenantId: string) {
    const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
    return this.prisma.category.create({
      data: { name: data.name, slug, icon: data.icon ?? null, color: data.color ?? '#6B7280', parentId: data.parentId ?? null, sortOrder: data.sortOrder ?? 0, tenantId },
    });
  }

  async updateCategory(id: string, data: any) {
    return this.prisma.category.update({
      where: { id },
      data: { name: data.name, icon: data.icon, color: data.color, parentId: data.parentId ?? null, sortOrder: data.sortOrder, isActive: data.isActive },
    });
  }

  async deleteCategory(id: string) {
    // Soft delete — deactivate only
    return this.prisma.category.update({ where: { id }, data: { isActive: false } });
  }

  async deleteProduct(id: string) {
    return this.prisma.product.update({ where: { id }, data: { isActive: false } });
  }

  async createProductWithInventory(data: any, tenantId: string) {
    const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
    const product = await this.prisma.product.create({
      data: {
        name: data.name, slug, barcode: data.barcode ?? null, sku: data.sku ?? null,
        description: data.description ?? null, costPrice: Number(data.costPrice ?? 0),
        sellingPrice: Number(data.sellingPrice), taxIncluded: data.taxIncluded ?? true,
        trackInventory: data.trackInventory ?? true, allowNegative: data.allowNegative ?? false,
        minStockAlert: Number(data.minStockAlert ?? 5), categoryId: data.categoryId ?? null, tenantId,
      },
    });
    // Create initial inventory record if quantity provided
    if (data.initialStock !== undefined && data.branchId) {
      await this.prisma.inventory.create({
        data: { productId: product.id, branchId: data.branchId, quantity: Number(data.initialStock ?? 0) },
      });
    }
    return product;
  }
}
