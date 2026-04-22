import { Controller, Get, Post, Put, Delete, Patch, Body, Param, Query, UseGuards, Request, DefaultValuePipe, ParseIntPipe, ParseBoolPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

@ApiTags('promotions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private promotionsService: PromotionsService) {}

  @Get()
  getAll(
    @Request() req: any,
    @Query('activeOnly', new DefaultValuePipe(false), ParseBoolPipe) activeOnly: boolean,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.promotionsService.getPromotions(req.user.tenantId, activeOnly, page, limit);
  }

  @Get('validate')
  validate(@Request() req: any, @Query('code') code: string, @Query('amount') amount: string) {
    return this.promotionsService.validatePromoCode(req.user.tenantId, code, parseFloat(amount) || 0);
  }

  @Post()
  create(@Body() data: any, @Request() req: any) {
    return this.promotionsService.createPromotion(data, req.user.tenantId, req.user.id);
  }

  @Post('apply')
  apply(@Body() body: { code: string }, @Request() req: any) {
    return this.promotionsService.applyPromoCode(req.user.tenantId, body.code);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.promotionsService.updatePromotion(id, data);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string) {
    return this.promotionsService.togglePromotion(id);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.promotionsService.deletePromotion(id);
  }
}
