import { Controller, Post, Get, Body, Param, Query, UseGuards, Request, DefaultValuePipe, ParseIntPipe, Res, Header } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PosService } from './pos.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('pos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class PosController {
  constructor(private posService: PosService) {}

  @Post()
  createSale(@Body() dto: CreateSaleDto, @Request() req: any) {
    dto.tenantId = req.user.tenantId;
    return this.posService.createSale(dto, req.user.id);
  }

  @Get()
  getSales(
    @Request() req: any,
    @Query('branchId') branchId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.posService.getSales(req.user.tenantId, branchId, page, limit);
  }

  @Get(':id')
  getSale(@Param('id') id: string) {
    return this.posService.getSaleById(id);
  }

  @Post(':id/void')
  @Roles('ADMIN', 'MANAGER')
  voidSale(@Param('id') id: string, @Request() req: any) {
    return this.posService.voidSale(id, req.user.id);
  }

  @Get(':id/receipt')
  @Header('Content-Type', 'text/html')
  async getReceipt(@Param('id') id: string, @Res() res: Response) {
    const html = await this.posService.getReceiptHtml(id);
    res.send(html);
  }
}
