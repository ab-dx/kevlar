import {
	WebSocketGateway,
	WebSocketServer,
	OnGatewayConnection,
	OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
	namespace: "/ws/assets",
	cors: { origin: "*" },
})
export class AssetGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer()
	server: Server;

	handleConnection(client: Socket) {
		// In production, verify a JWT here
		const tenantId = client.handshake.headers["x-tenant-id"];

		if (!tenantId) {
			console.log(`[WebSocket] Connection rejected: Missing tenantId`);
			client.disconnect();
			return;
		}

		client.join(`tenant_${tenantId}`);
		console.log(`[WebSocket] Client joined room: tenant_${tenantId}`);
	}

	handleDisconnect(client: Socket) {
		console.log(`[WebSocket] Client disconnected: ${client.id}`);
	}

	sendProcessingUpdate(tenantId: string, payload: any) {
		this.server.to(`tenant_${tenantId}`).emit("asset_processed", payload);
	}
}
