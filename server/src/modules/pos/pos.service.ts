import { Injectable, BadRequestException, NotFoundException, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { PosGateway } from './pos.gateway';

@Injectable()
export class PosService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => PosGateway)) private gateway: PosGateway,
  ) {}

  async createSale(dto: CreateSaleDto, cashierId: string) {
    const productIds = dto.items.map((i) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: { inventory: { where: { branchId: dto.branchId } } },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products not found or inactive');
    }

    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.productId)!;
      if (product.trackInventory) {
        const inv = product.inventory[0];
        const available = inv ? inv.quantity - inv.reservedQty : 0;
        if (!product.allowNegative && available < item.quantity) {
          throw new BadRequestException(`Insufficient stock for: ${product.name}`);
        }
      }
    }

    let subtotal = 0;
    let taxAmount = 0;
    const saleItems = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const unitPrice = item.unitPrice ?? product.sellingPrice;
      const lineTotal = unitPrice * item.quantity - (item.discount ?? 0);
      const lineTax = product.taxIncluded ? 0 : lineTotal * (item.taxRate ?? 0.05);
      subtotal += lineTotal;
      taxAmount += lineTax;
      return {
        productId: item.productId,
        variantId: item.variantId ?? null,
        name: product.name,
        barcode: product.barcode ?? null,
        quantity: item.quantity,
        unitPrice,
        costPrice: product.costPrice,
        discount: item.discount ?? 0,
        taxRate: item.taxRate ?? 0.05,
        taxAmount: lineTax,
        total: lineTotal + lineTax,
      };
    });

    const discount = dto.discountAmount ?? 0;
    const total = subtotal + taxAmount - discount;
    const receiptNumber = await this.generateReceiptNumber(dto.branchId);

    const sale = await this.prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          receiptNumber,
          tenantId: dto.tenantId,
          branchId: dto.branchId,
          cashierId,
          customerId: dto.customerId ?? null,
          deviceId: dto.deviceId ?? null,
          subtotal,
          discountAmount: discount,
          taxAmount,
          total,
          notes: dto.notes ?? null,
          isOffline: dto.isOffline ?? false,
          syncStatus: dto.isOffline ? 'PENDING' : 'SYNCED',
          offlineCreatedAt: dto.isOffline && dto.offlineCreatedAt ? new Date(dto.offlineCreatedAt) : null,
          items: { create: saleItems },
          payments: {
            create: dto.payments.map((p) => ({
              method: p.method as any,
              amount: p.amount,
              reference: p.reference ?? null,
              cashGiven: p.cashGiven ?? null,
              changeDue: p.changeDue ?? null,
              pointsUsed: p.pointsUsed ?? null,
            })),
          },
        },
        include: { items: true, payments: true, cashier: { select: { name: true } } },
      });

      for (const item of saleItems) {
        const product = products.find((p) => p.id === item.productId)!;
        if (!product.trackInventory) continue;
        const inv = await tx.inventory.findFirst({
          where: { productId: item.productId, branchId: dto.branchId },
        });
        if (inv) {
          await tx.inventory.update({ where: { id: inv.id }, data: { quantity: { decrement: item.quantity } } });
          await tx.stockMovement.create({
            data: {
              inventoryId: inv.id, type: 'SALE', quantity: -item.quantity,
              balanceBefore: inv.quantity, balanceAfter: inv.quantity - item.quantity,
              referenceId: created.id, referenceType: 'SALE',
            },
          });
        }
      }

      if (dto.customerId) {
        const loyaltyEarned = Math.floor(total / 10);
        const customer = await tx.customer.findUnique({ where: { id: dto.customerId } });
        await tx.customer.update({
          where: { id: dto.customerId },
          data: { totalSpent: { increment: total }, visitCount: { increment: 1 }, loyaltyPoints: { increment: loyaltyEarned } },
        });
        if (loyaltyEarned > 0 && customer) {
          await tx.loyaltyLedger.create({
            data: {
              customerId: dto.customerId, action: 'EARNED', points: loyaltyEarned,
              balanceBefore: customer.loyaltyPoints, balanceAfter: customer.loyaltyPoints + loyaltyEarned,
              referenceId: created.id,
            },
          });
        }
      }

      return created;
    });

    this.gateway?.emitSaleCreated(dto.tenantId, sale);
    return sale;
  }

  async getSaleById(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: { items: true, payments: true, cashier: { select: { name: true } }, customer: { select: { name: true, phone: true } } },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async voidSale(saleId: string, cashierId: string) {
    const sale = await this.prisma.sale.findUnique({ where: { id: saleId }, include: { items: true } });
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status !== 'COMPLETED') throw new BadRequestException('Only completed sales can be voided');

    await this.prisma.$transaction(async (tx) => {
      await tx.sale.update({ where: { id: saleId }, data: { status: 'VOIDED' } });
      for (const item of sale.items) {
        const inv = await tx.inventory.findFirst({ where: { productId: item.productId, branchId: sale.branchId } });
        if (inv) {
          await tx.inventory.update({ where: { id: inv.id }, data: { quantity: { increment: item.quantity } } });
          await tx.stockMovement.create({
            data: {
              inventoryId: inv.id, type: 'RETURN', quantity: item.quantity,
              balanceBefore: inv.quantity, balanceAfter: inv.quantity + item.quantity,
              referenceId: saleId, referenceType: 'VOID',
            },
          });
        }
      }
      await tx.auditLog.create({
        data: { tenantId: sale.tenantId, userId: cashierId, action: 'VOID_SALE', entity: 'Sale', entityId: saleId, before: { status: 'COMPLETED' }, after: { status: 'VOIDED' } },
      });
    });

    return { success: true };
  }

  async getSales(tenantId: string, branchId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId, ...(branchId && { branchId }) };
    const [sales, total] = await Promise.all([
      this.prisma.sale.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { items: true, payments: true, cashier: { select: { name: true } }, customer: { select: { name: true } } },
      }),
      this.prisma.sale.count({ where }),
    ]);
    return { data: sales, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getReceiptHtml(saleId: string): Promise<string> {
    const sale = await this.prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        items: true,
        payments: true,
        cashier: { select: { name: true } },
        customer: { select: { name: true, phone: true } },
        branch: { select: { name: true, address: true, phone: true } },
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');

    const fmt = (n: number | any) => `AED ${Number(n ?? 0).toFixed(2)}`;
    const date = new Date(sale.createdAt);
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const itemRows = sale.items.map((item) => `
      <tr>
        <td style="padding:6px 0;border-bottom:1px dashed #e5e7eb">${item.name}<br><small style="color:#6b7280">× ${item.quantity} @ ${fmt(item.unitPrice)}</small></td>
        <td style="padding:6px 0;border-bottom:1px dashed #e5e7eb;text-align:right;font-weight:600">${fmt(item.total)}</td>
      </tr>`).join('');

    const paymentRows = sale.payments.map((p) => `
      <tr>
        <td style="padding:3px 0;color:#6b7280">${p.method}</td>
        <td style="padding:3px 0;text-align:right">${fmt(p.amount)}</td>
      </tr>`).join('');

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Courier New', monospace; font-size:13px; color:#111; background:#fff; max-width:320px; margin:0 auto; padding:16px; }
  .center { text-align:center; }
  .divider { border-top:2px dashed #d1d5db; margin:12px 0; }
  table { width:100%; border-collapse:collapse; }
  .total-row td { padding:4px 0; font-weight:700; font-size:16px; }
  .grand-total { font-size:20px; color:#4f46e5; }
  @media print { body { max-width:100%; } }
</style>
</head><body>
  <div class="center" style="margin-bottom:12px">
    <div style="font-size:22px;font-weight:900;color:#4f46e5">Ddotsmedia POS</div>
    <div style="font-size:12px;color:#6b7280">${sale.branch?.name ?? ''}</div>
    ${sale.branch?.address ? `<div style="font-size:11px;color:#9ca3af">${sale.branch.address}</div>` : ''}
    ${sale.branch?.phone ? `<div style="font-size:11px;color:#9ca3af">Tel: ${sale.branch.phone}</div>` : ''}
  </div>

  <div class="divider"></div>

  <div style="margin-bottom:8px;font-size:11px;color:#6b7280">
    <div>Receipt: <strong style="color:#111">${sale.receiptNumber}</strong></div>
    <div>Date: ${dateStr} ${timeStr}</div>
    <div>Cashier: ${sale.cashier?.name ?? '—'}</div>
    ${sale.customer ? `<div>Customer: ${sale.customer.name}</div>` : ''}
    <div>Status: <strong style="color:${sale.status === 'COMPLETED' ? '#16a34a' : '#dc2626'}">${sale.status}</strong></div>
  </div>

  <div class="divider"></div>

  <table>${itemRows}</table>

  <div class="divider"></div>

  <table>
    <tr><td style="color:#6b7280">Subtotal</td><td style="text-align:right">${fmt(sale.subtotal)}</td></tr>
    ${Number(sale.discountAmount) > 0 ? `<tr><td style="color:#dc2626">Discount</td><td style="text-align:right;color:#dc2626">−${fmt(sale.discountAmount)}</td></tr>` : ''}
    <tr><td style="color:#6b7280">VAT (5%)</td><td style="text-align:right">${fmt(sale.taxAmount)}</td></tr>
    <tr class="total-row"><td class="grand-total">TOTAL</td><td class="grand-total" style="text-align:right">${fmt(sale.total)}</td></tr>
  </table>

  <div class="divider"></div>

  <table style="margin-bottom:4px">
    <tr><td style="color:#6b7280;font-size:11px" colspan="2">Payment</td></tr>
    ${paymentRows}
  </table>

  <div class="divider"></div>

  <div class="center" style="font-size:11px;color:#9ca3af;margin-top:8px">
    <div>Thank you for your purchase!</div>
    <div>Powered by Ddotsmedia POS</div>
  </div>
</body></html>`;
  }

  private async generateReceiptNumber(branchId: string): Promise<string> {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.sale.count({
      where: { branchId, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    });
    return `RCP-${today}-${String(count + 1).padStart(4, '0')}`;
  }
}
