import { 
  WebSocketGateway, 
  WebSocketServer, 
  OnGatewayConnection, 
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', 
  },
})
export class AssetGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`[WebSocket] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[WebSocket] Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinTenantRoom')
  handleJoinRoom(
    @ConnectedSocket() client: Socket, 
    @MessageBody('tenantId') tenantId: string
  ) {
    if (tenantId) {
      client.join(tenantId);
      console.log(`[WebSocket] Client ${client.id} joined room: ${tenantId}`);
      return { status: 'Joined room successfully' };
    }
  }
}
