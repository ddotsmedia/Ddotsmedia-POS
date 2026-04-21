import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('stats')
  getStats(@Request() req: any) {
    return this.adminService.getStats(req.user.tenantId);
  }

  @Get('users')
  getUsers(@Request() req: any) {
    return this.adminService.getUsers(req.user.tenantId);
  }

  @Post('users')
  createUser(@Body() data: any, @Request() req: any) {
    return this.adminService.createUser(data, req.user.tenantId);
  }

  @Put('users/:id/role')
  updateRole(@Param('id') id: string, @Body() body: { role: string }) {
    return this.adminService.updateUserRole(id, body.role);
  }

  @Put('users/:id/toggle')
  toggleUser(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.adminService.toggleUser(id, body.isActive);
  }

  @Get('audit-logs')
  getAuditLogs(@Request() req: any, @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number) {
    return this.adminService.getAuditLogs(req.user.tenantId, page);
  }
}
