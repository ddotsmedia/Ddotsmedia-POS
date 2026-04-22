import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Get()
  getAll(
    @Request() req: any,
    @Query('branchId') branchId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.expensesService.getExpenses(req.user.tenantId, branchId, from, to, page, limit);
  }

  @Get('summary')
  getSummary(@Request() req: any, @Query('branchId') branchId: string) {
    return this.expensesService.getExpenseSummary(req.user.tenantId, branchId);
  }

  @Post()
  create(@Body() data: any, @Request() req: any) {
    return this.expensesService.createExpense(data, req.user.tenantId, req.user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.expensesService.updateExpense(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.expensesService.deleteExpense(id);
  }
}
