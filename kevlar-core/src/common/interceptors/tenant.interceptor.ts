import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
	UnauthorizedException,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tenantContext } from "../../core/context/tenant.context";

@Injectable()
export class TenantInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest();

		const tenantId = request.headers["x-tenant-id"];

		if (!tenantId) {
			throw new UnauthorizedException(
				"Missing x-tenant-id header. Access Denied.",
			);
		}

		return tenantContext.run({ tenantId }, () => {
			return next.handle();
		});
	}
}
