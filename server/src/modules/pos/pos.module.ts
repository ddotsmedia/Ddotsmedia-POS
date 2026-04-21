import { Module } from '@nestjs/common';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';
import { PosGateway } from './pos.gateway';

@Module({
  controllers: [PosController],
  providers: [PosService, PosGateway],
  exports: [PosService, PosGateway],
})
export class PosModule {}
