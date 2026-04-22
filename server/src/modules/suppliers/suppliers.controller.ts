import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

@ApiTags('suppliers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('suppliers')
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Get()
  getAll(
    @Request() req: any,
    @Query('search') search: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.suppliersService.getSuppliers(req.user.tenantId, search, page, limit);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.suppliersService.getSupplier(id);
  }

  @Post()
  create(@Body() data: any, @Request() req: any) {
    return this.suppliersService.createSupplier(data, req.user.tenantId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.suppliersService.updateSupplier(id, data);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.suppliersService.deactivateSupplier(id);
  }
}
