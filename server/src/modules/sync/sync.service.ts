import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface OfflineRecord {
  localId: string;
  type: 'SALE' | 'INVENTORY_ADJUSTMENT' | 'CUSTOMER';
  payload: any;
  createdAt: string;
  deviceId: string;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private prisma: PrismaService) {}

  // ── Push offline records from device ────────────────────────────────────
  async pushOfflineRecords(records: OfflineRecord[], deviceId: string) {
    const results: { localId: string; status: string; serverId?: string; error?: string }[] = [];

    for (const record of records) {
      try {
        let serverId: string | undefined;

        switch (record.type) {
          case 'SALE':
            serverId = await this.syncSale(record.payload, deviceId);
            break;
          case 'INVENTORY_ADJUSTMENT':
            serverId = await this.syncInventoryAdjustment(record.payload);
            break;
          case 'CUSTOMER':
            serverId = await this.syncCustomer(record.payload);
            break;
        }

        await this.prisma.syncLog.create({
          data: {
            deviceId,
            type: record.type,
            recordId: serverId ?? record.localId,
            status: 'SYNCED',
            payload: record.payload,
            syncedAt: new Date(),
          },
        });

        results.push({ localId: record.localId, status: 'synced', serverId });
      } catch (error: any) {
        this.logger.error(`Sync failed for ${record.localId}: ${error.message}`);

        await this.prisma.syncLog.create({
          data: {
            deviceId,
            type: record.type,
            recordId: record.localId,
            status: 'FAILED',
            payload: record.payload,
            error: error.message,
            attempts: 1,
          },
        });

        results.push({ localId: record.localId, status: 'failed', error: error.message });
      }
    }

    const synced = results.filter((r) => r.status === 'synced').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    this.logger.log(`Sync complete: ${synced} synced, ${failed} failed`);
    return { results, summary: { synced, failed, total: records.length } };
  }

  // ── Pull latest catalog (products, prices, settings) ─────────────────────
  async pullCatalog(tenantId: string, branchId: string, since?: string) {
    const sinceDate = since ? new Date(since) : new Date(0);

    const [products, categories, customers, settings] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId, isActive: true, updatedAt: { gte: sinceDate } },
        include: { variants: true, inventory: { where: { branchId } } },
      }),
      this.prisma.category.findMany({
        where: { tenantId, isActive: true },
      }),
      this.prisma.customer.findMany({
        where: { tenantId, updatedAt: { gte: sinceDate } },
        select: { id: true, name: true, phone: true, loyaltyPoints: true },
      }),
      this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { currency: true, taxRate: true, taxLabel: true, timezone: true },
      }),
    ]);

    return {
      syncedAt: new Date().toISOString(),
      products,
      categories,
      customers,
      settings,
    };
  }

  // ── Conflict resolution for a specific record ────────────────────────────
  async resolveConflict(localRecord: any, serverRecord: any, strategy: 'local' | 'server' = 'server') {
    if (strategy === 'server') return serverRecord;

    // Merge strategy: take most recent field values
    const merged = { ...serverRecord };
    for (const key of Object.keys(localRecord)) {
      const localTime = new Date(localRecord.updatedAt).getTime();
      const serverTime = new Date(serverRecord.updatedAt).getTime();
      if (localTime > serverTime) {
        merged[key] = localRecord[key];
      }
    }
    return merged;
  }

  // ── Private sync handlers ────────────────────────────────────────────────

  private async syncSale(payload: any, deviceId: string): Promise<string> {
    // Check for duplicate (idempotent sync)
    const existing = await this.prisma.sale.findFirst({
      where: { deviceId, offlineCreatedAt: new Date(payload.offlineCreatedAt) },
    });
    if (existing) return existing.id;

    const sale = await this.prisma.sale.create({
      data: {
        ...payload,
        syncStatus: 'SYNCED',
        isOffline: true,
        deviceId,
        items: { create: payload.items },
        payments: { create: payload.payments },
      },
    });

    return sale.id;
  }

  private async syncInventoryAdjustment(payload: any): Promise<string> {
    const inv = await this.prisma.inventory.findFirst({
      where: { productId: payload.productId, branchId: payload.branchId },
    });

    if (!inv) throw new Error(`Inventory not found for product ${payload.productId}`);

    await this.prisma.inventory.update({
      where: { id: inv.id },
      data: { quantity: { increment: payload.quantityDelta } },
    });

    const movement = await this.prisma.stockMovement.create({
      data: {
        inventoryId: inv.id,
        type: 'ADJUSTMENT',
        quantity: payload.quantityDelta,
        balanceBefore: inv.quantity,
        balanceAfter: inv.quantity + payload.quantityDelta,
        note: payload.note,
        createdBy: payload.userId,
      },
    });

    return movement.id;
  }

  private async syncCustomer(payload: any): Promise<string> {
    const existing = await this.prisma.customer.findFirst({
      where: { tenantId: payload.tenantId, phone: payload.phone },
    });

    if (existing) {
      await this.prisma.customer.update({
        where: { id: existing.id },
        data: { name: payload.name, email: payload.email },
      });
      return existing.id;
    }

    const customer = await this.prisma.customer.create({ data: payload });
    return customer.id;
  }
}
