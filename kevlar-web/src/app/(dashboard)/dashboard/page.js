export default function DashboardPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
				<p className="text-muted-foreground mt-2">Welcome to your workspace.</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
				{/* Placeholder Stat Cards */}
				<div className="p-6 border border-border bg-card rounded-xl shadow-sm">
					<h3 className="text-sm font-medium text-muted-foreground">
						Active Assets
					</h3>
					<p className="text-3xl font-bold mt-2">1,248</p>
				</div>
				<div className="p-6 border border-border bg-card rounded-xl shadow-sm">
					<h3 className="text-sm font-medium text-muted-foreground">
						Pending Review
					</h3>
					<p className="text-3xl font-bold mt-2 text-yellow-500">12</p>
				</div>
				<div className="p-6 border border-border bg-card rounded-xl shadow-sm">
					<h3 className="text-sm font-medium text-muted-foreground">
						Bandwidth (30d)
					</h3>
					<p className="text-3xl font-bold mt-2">4.2 TB</p>
				</div>
			</div>
		</div>
	);
}
