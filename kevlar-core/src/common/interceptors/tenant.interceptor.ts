import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
	InternalServerErrorException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { tenantContext } from "../../core/context/tenant.context";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class TenantInterceptor implements NestInterceptor {
	constructor(private reflector: Reflector) {}

	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		]);

		if (isPublic) {
			return next.handle();
		}

		const request = context.switchToHttp().getRequest();
		const user = request.user;

		if (!user || !user.tenantId) {
			throw new InternalServerErrorException(
				"Tenant context missing. Did you forget @UseGuards(ClerkAuthGuard)?",
			);
		}

		return tenantContext.run(
			{ tenantId: user.tenantId, userId: user.id },
			() => {
				return next.handle();
			},
		);
	}
}
