import {
	Injectable,
	CanActivate,
	ExecutionContext,
	UnauthorizedException,
} from "@nestjs/common";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ClerkAuthGuard implements CanActivate {
	constructor(private configService: ConfigService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest();

		try {
			const webHeaders = new Headers();
			for (const key in request.headers) {
				webHeaders.append(key, request.headers[key] as string);
			}

			const webRequest = new Request(`http://localhost${request.url}`, {
				method: request.method,
				headers: webHeaders,
			});

			const requestState = await clerkClient.authenticateRequest({
				request: webRequest,
				secretKey: this.configService.get<string>("CLERK_SECRET_KEY"),
				publishableKey: this.configService.get<string>("CLERK_PUBLISHABLE_KEY"),
			});

			if (!requestState.isSignedIn) {
				throw new UnauthorizedException(
					"Invalid or missing authentication token.",
				);
			}

			const auth = requestState.toAuth();

			const claims = auth.sessionClaims as any;

			const tenantId = auth.orgId || claims?.o?.id;
			let role = auth.orgRole || claims?.o?.rol;

			if (role && !role.startsWith("org:")) {
				role = `org:${role}`;
			}

			if (!tenantId) {
				throw new UnauthorizedException(
					"You must be acting within an Organization context.",
				);
			}

			request.user = { id: auth.userId, tenantId, role };

			return true;
		} catch (err) {
			console.error("[Auth] Verification failed:", err);
			throw new UnauthorizedException("Authentication failed.");
		}
	}
}
