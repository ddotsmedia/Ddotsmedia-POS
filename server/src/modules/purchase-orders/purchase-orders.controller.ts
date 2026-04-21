import { Controller, Get, Post, Put, Param, Body, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PurchaseOrdersService } from './purchase-orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('purchase-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private service: PurchaseOrdersService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER', 'INVENTORY')
  getOrders(@Request() req: any, @Query('branchId') branchId: string) {
    return this.service.getOrders(req.user.tenantId, branchId);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  createOrder(@Body() data: any, @Request() req: any) {
    return this.service.createOrder(data, req.user.id, req.user.tenantId);
  }

  @Put(':id/receive')
  @Roles('ADMIN', 'MANAGER', 'INVENTORY')
  receiveOrder(@Param('id') id: string, @Request() req: any) {
    return this.service.receiveOrder(id, req.user.id);
  }
}
