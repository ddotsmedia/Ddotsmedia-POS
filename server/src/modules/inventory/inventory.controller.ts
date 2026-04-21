import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  getInventory(@Request() req: any, @Query('branchId') branchId: string) {
    return this.inventoryService.getInventory(req.user.tenantId, branchId);
  }

  @Get('low-stock')
  getLowStock(@Request() req: any, @Query('branchId') branchId: string) {
    return this.inventoryService.getLowStock(req.user.tenantId, branchId);
  }

  @Put('adjust')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER', 'INVENTORY')
  adjustStock(@Body() body: { productId: string; branchId: string; quantityDelta: number; note: string }, @Request() req: any) {
    return this.inventoryService.adjustStock(body.productId, body.branchId, body.quantityDelta, body.note, req.user.id);
  }

  @Post('transfer')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  transferStock(@Body() body: { fromBranchId: string; toBranchId: string; productId: string; quantity: number }, @Request() req: any) {
    return this.inventoryService.transferStock(body.fromBranchId, body.toBranchId, body.productId, body.quantity, req.user.id);
  }
}

// Products controller (separate route)
@ApiTags('products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private inventoryService: InventoryService) {}

  @Get()
  getProducts(
    @Request() req: any,
    @Query('search') search: string,
    @Query('categoryId') categoryId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.inventoryService.getProducts(req.user.tenantId, search, categoryId, page, limit);
  }

  @Get('search')
  searchByBarcode(@Query('q') q: string, @Request() req: any) {
    return this.inventoryService.getProductByBarcode(q, req.user.tenantId);
  }

  @Get('categories')
  getCategories(@Request() req: any) {
    return this.inventoryService.getCategories(req.user.tenantId);
  }

  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  createCategory(@Body() data: any, @Request() req: any) {
    return this.inventoryService.createCategory(data, req.user.tenantId);
  }

  @Put('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  updateCategory(@Param('id') id: string, @Body() data: any) {
    return this.inventoryService.updateCategory(id, data);
  }

  @Delete('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  deleteCategory(@Param('id') id: string) {
    return this.inventoryService.deleteCategory(id);
  }

  @Get('barcode/:barcode')
  getByBarcode(@Param('barcode') barcode: string, @Request() req: any) {
    return this.inventoryService.getProductByBarcode(barcode, req.user.tenantId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  createProduct(@Body() data: any, @Request() req: any) {
    return this.inventoryService.createProductWithInventory(data, req.user.tenantId);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  updateProduct(@Param('id') id: string, @Body() data: any) {
    return this.inventoryService.updateProduct(id, data);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  deleteProduct(@Param('id') id: string) {
    return this.inventoryService.deleteProduct(id);
  }
}
