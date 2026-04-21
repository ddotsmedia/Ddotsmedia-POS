import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('query')
  query(@Body() body: { question: string }, @Request() req: any) {
    return this.aiService.naturalLanguageQuery(body.question, req.user.tenantId);
  }

  @Get('insights/daily')
  dailyInsights(@Request() req: any, @Query('branchId') branchId: string) {
    return this.aiService.generateDailySummary(req.user.tenantId, branchId);
  }

  @Get('forecast/:productId')
  forecast(@Query('productId') productId: string, @Query('days') days: string) {
    return this.aiService.forecastDemand(productId, parseInt(days) || 30);
  }

  @Get('anomalies')
  anomalies(@Request() req: any, @Query('branchId') branchId: string) {
    return this.aiService.detectAnomalies(req.user.tenantId, branchId);
  }

  @Post('chat')
  chat(@Body() body: { messages: { role: 'user' | 'assistant'; content: string }[] }) {
    return this.aiService.chat(body.messages);
  }

  @Get('recommendations')
  recommendations(@Query('productId') productId: string, @Request() req: any) {
    return this.aiService.getProductRecommendations(productId, req.user.tenantId);
  }
}
