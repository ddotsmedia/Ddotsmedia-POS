import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  getAll(@Request() req: any, @Query('search') search: string, @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number, @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number) {
    return this.customersService.getCustomers(req.user.tenantId, search, page, limit);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.customersService.getCustomer(id);
  }

  @Post()
  create(@Body() data: any, @Request() req: any) {
    return this.customersService.createCustomer(data, req.user.tenantId);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.customersService.updateCustomer(id, data);
  }

  @Get(':id/loyalty')
  getLoyalty(@Param('id') id: string) {
    return this.customersService.getLoyalty(id);
  }

  @Post(':id/loyalty/redeem')
  redeemPoints(@Param('id') id: string, @Body() body: { points: number }) {
    return this.customersService.redeemPoints(id, body.points);
  }
}
