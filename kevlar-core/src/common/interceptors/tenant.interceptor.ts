import {
	CallHandler,
	ExecutionContext,
	Injectable,
	NestInterceptor,
	UnauthorizedException,
	InternalServerErrorException,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tenantContext } from "../../core/context/tenant.context";

@Injectable()
export class TenantInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const request = context.switchToHttp().getRequest();

		const user = request.user;
		if (!user || !user.tenantId) {
			throw new InternalServerErrorException("Tenant context missing");
		}

		return tenantContext.run(
			{ tenantId: user.tenantId, userId: user.id },
			() => {
				return next.handle();
			},
		);
		// const tenantId = request.headers["x-tenant-id"];
		//
		// if (!tenantId) {
		// 	throw new UnauthorizedException(
		// 		"Missing x-tenant-id header. Access Denied.",
		// 	);
		// }
		//
		// return tenantContext.run({ tenantId }, () => {
		// 	return next.handle();
		// });
	}
}
