import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PurchaseOrderStatus } from '@prisma/client';

@Injectable()
export class PurchaseOrdersService {
  constructor(private prisma: PrismaService) {}

  async getOrders(tenantId: string, branchId?: string) {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: { tenantId, ...(branchId && { branchId }) },
      include: {
        items: { include: { product: { select: { name: true } } } },
        supplier: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => ({
      ...o,
      supplierName: o.supplier.name,
      orderNumber: `PO-${o.id.slice(-8).toUpperCase()}`,
    }));
  }

  async createOrder(data: any, userId: string, tenantId: string) {
    const totalCost = data.items.reduce(
      (sum: number, i: any) => sum + i.quantity * i.unitCost,
      0,
    );

    // Find or create supplier by name
    let supplier = await this.prisma.supplier.findFirst({
      where: { tenantId, name: data.supplierName },
    });
    if (!supplier) {
      supplier = await this.prisma.supplier.create({
        data: { tenantId, name: data.supplierName, phone: data.supplierContact ?? null },
      });
    }

    return this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        branchId: data.branchId,
        supplierId: supplier.id,
        createdBy: userId,
        notes: data.notes ?? null,
        totalCost,
        status: PurchaseOrderStatus.SENT,
        orderedAt: new Date(),
        items: {
          create: data.items.map((i: any) => ({
            productId: i.productId,
            orderedQty: i.quantity,
            unitCost: i.unitCost,
          })),
        },
      },
      include: { items: true, supplier: { select: { name: true } } },
    });
  }

  async receiveOrder(orderId: string, userId: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Purchase order not found');
    if (order.status === PurchaseOrderStatus.RECEIVED) throw new BadRequestException('Order already received');
    if (order.status === PurchaseOrderStatus.CANCELLED) throw new BadRequestException('Cancelled orders cannot be received');

    await this.prisma.$transaction(async (tx) => {
      await tx.purchaseOrder.update({
        where: { id: orderId },
        data: { status: 'RECEIVED', receivedAt: new Date() },
      });

      for (const item of order.items) {
        await tx.purchaseOrderItem.update({
          where: { id: item.id },
          data: { receivedQty: item.orderedQty },
        });

        const inv = await tx.inventory.findFirst({
          where: { productId: item.productId, branchId: order.branchId },
        });
        if (inv) {
          await tx.inventory.update({
            where: { id: inv.id },
            data: { quantity: { increment: item.orderedQty } },
          });
          await tx.stockMovement.create({
            data: {
              inventoryId: inv.id,
              type: 'PURCHASE',
              quantity: item.orderedQty,
              balanceBefore: inv.quantity,
              balanceAfter: inv.quantity + item.orderedQty,
              referenceId: orderId,
              referenceType: 'PURCHASE_ORDER',
              createdBy: userId,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          tenantId: order.tenantId,
          userId,
          action: 'RECEIVE_PURCHASE_ORDER',
          entity: 'PurchaseOrder',
          entityId: orderId,
          after: { status: 'RECEIVED' },
        },
      });
    });

    return { success: true };
  }
}
