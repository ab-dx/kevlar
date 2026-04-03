import { tenantContext } from "../context/tenant.context";

export function tenantAwarePlugin(schema: any) {
	const types = [
		"find",
		"findOne",
		"count",
		"countDocuments",
		"findOneAndUpdate",
		"update",
		"updateOne",
		"updateMany",
	];

	schema.pre(types, function (this: any) {
		const store = tenantContext.getStore();

		if (store && store.tenantId) {
			this.where({ tenantId: store.tenantId });
		}
	});
}
