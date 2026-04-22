import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GiftCardsService } from './gift-cards.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

@ApiTags('gift-cards')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gift-cards')
export class GiftCardsController {
  constructor(private giftCardsService: GiftCardsService) {}

  @Get()
  getAll(
    @Request() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.giftCardsService.getGiftCards(req.user.tenantId, page, limit);
  }

  @Get('lookup')
  lookup(@Request() req: any, @Query('code') code: string) {
    return this.giftCardsService.lookupByCode(req.user.tenantId, code);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.giftCardsService.getGiftCard(id);
  }

  @Post()
  create(@Body() data: any, @Request() req: any) {
    return this.giftCardsService.createGiftCard(data, req.user.tenantId, req.user.id);
  }

  @Post(':id/top-up')
  topUp(@Param('id') id: string, @Body() body: { amount: number; note?: string }, @Request() req: any) {
    return this.giftCardsService.topUp(id, body.amount, body.note ?? '', req.user.id);
  }

  @Post(':id/redeem')
  redeem(@Param('id') id: string, @Body() body: { amount: number; saleId?: string }, @Request() req: any) {
    return this.giftCardsService.redeem(id, body.amount, body.saleId ?? '', req.user.id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.giftCardsService.deactivate(id);
  }
}
