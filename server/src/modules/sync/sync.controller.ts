import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

@ApiTags('sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private syncService: SyncService) {}

  @Post('push')
  push(@Body() body: { records: any[]; deviceId: string }) {
    return this.syncService.pushOfflineRecords(body.records, body.deviceId);
  }

  @Get('pull')
  pull(@Request() req: any, @Query('since') since: string) {
    return this.syncService.pullCatalog(req.user.tenantId, req.user.branchId ?? '', since);
  }
}
