import { Module } from '@nestjs/common';
import { InventoryController, ProductsController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  controllers: [InventoryController, ProductsController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
