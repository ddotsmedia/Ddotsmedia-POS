import { WebSocketGateway, WebSocketServer, OnGatewayInit } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/events',
})
export class PosGateway implements OnGatewayInit {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(PosGateway.name);

  afterInit() {
    this.logger.log('WebSocket gateway initialized');
  }

  emitSaleCreated(tenantId: string, sale: any) {
    this.server.emit(`sale:${tenantId}`, {
      type: 'SALE_CREATED',
      sale: {
        id: sale.id,
        receiptNumber: sale.receiptNumber,
        total: sale.total,
        cashierName: sale.cashier?.name,
        itemCount: sale.items?.length ?? 0,
        createdAt: sale.createdAt,
      },
    });
  }

  emitLowStock(tenantId: string, product: any) {
    this.server.emit(`alert:${tenantId}`, {
      type: 'LOW_STOCK',
      product: { id: product.id, name: product.name, stock: product.stock },
    });
  }
}
