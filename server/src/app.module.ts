import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PosModule } from './modules/pos/pos.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AiModule } from './modules/ai/ai.module';
import { SyncModule } from './modules/sync/sync.module';
import { BranchesModule } from './modules/branches/branches.module';
import { AdminModule } from './modules/admin/admin.module';
import { PurchaseOrdersModule } from './modules/purchase-orders/purchase-orders.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { GiftCardsModule } from './modules/gift-cards/gift-cards.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 100 },
      { name: 'long', ttl: 60000, limit: 1000 },
    ]),
    PrismaModule,
    AuthModule,
    PosModule,
    InventoryModule,
    CustomersModule,
    ReportsModule,
    AiModule,
    SyncModule,
    BranchesModule,
    AdminModule,
    PurchaseOrdersModule,
    ExpensesModule,
    GiftCardsModule,
    PromotionsModule,
    SuppliersModule,
  ],
})
export class AppModule {}
