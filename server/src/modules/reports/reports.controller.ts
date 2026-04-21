import { Controller, Get, Query, UseGuards, Request, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('sales')
  getSales(@Request() req: any, @Query('from') from: string, @Query('to') to: string, @Query('branchId') branchId: string) {
    const f = from || new Date(new Date().setDate(1)).toISOString();
    const t = to || new Date().toISOString();
    return this.reportsService.getSalesSummary(req.user.tenantId, f, t, branchId);
  }

  @Get('profit')
  getProfit(@Request() req: any, @Query('from') from: string, @Query('to') to: string, @Query('branchId') branchId: string) {
    const f = from || new Date(new Date().setDate(1)).toISOString();
    const t = to || new Date().toISOString();
    return this.reportsService.getProfitLoss(req.user.tenantId, f, t, branchId);
  }

  @Get('cashier')
  getCashier(@Request() req: any, @Query('from') from: string, @Query('to') to: string, @Query('branchId') branchId: string) {
    const f = from || new Date(new Date().setDate(1)).toISOString();
    const t = to || new Date().toISOString();
    return this.reportsService.getCashierReport(req.user.tenantId, f, t, branchId);
  }

  @Get('inventory')
  getInventory(@Request() req: any, @Query('branchId') branchId: string) {
    return this.reportsService.getInventoryReport(req.user.tenantId, branchId);
  }

  @Get('export')
  async exportCsv(
    @Request() req: any,
    @Query('type') type: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('branchId') branchId: string,
    @Res() res: Response,
  ) {
    const f = from || new Date(new Date().setDate(1)).toISOString();
    const t = to || new Date().toISOString();
    const csv = await this.reportsService.exportCsv(req.user.tenantId, type, f, t, branchId);
    const filename = `${type}-report-${f.slice(0, 10)}-to-${t.slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
