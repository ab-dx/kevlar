"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	FolderKanban,
	ShieldCheck,
	Clock,
	CheckCircle2,
	Loader2,
	AlertCircle,
	UploadCloud,
	Activity,
	ArrowRight,
} from "lucide-react";

export default function DashboardPage() {
	const { getToken } = useAuth();
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	const [stats, setStats] = useState({
		totalAssets: 0,
		inReview: 0,
		approved: 0,
		totalDeliveries: 0,
	});
	const [recentLogs, setRecentLogs] = useState([]);
	const [pendingAssets, setPendingAssets] = useState([]);

	useEffect(() => {
		async function loadDashboardData() {
			try {
				const token = await getToken();
				const apiBase =
					process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
				const headers = { Authorization: `Bearer ${token}` };

				const [statsRes, deliveriesRes, logsRes, pendingRes] =
					await Promise.all([
						fetch(`${apiBase}/assets/stats/overview`, { headers }),
						fetch(`${apiBase}/delivery`, { headers }),
						fetch(`${apiBase}/audit`, { headers }),
						fetch(`${apiBase}/assets?IN_REVIEW&limit=4`, { headers }),
					]);

				if (!statsRes.ok)
					throw new Error("Failed to load dashboard statistics");

				const statsData = await statsRes.json();
				const deliveriesData = deliveriesRes.ok
					? await deliveriesRes.json()
					: { data: [] };
				const logsData = logsRes.ok ? await logsRes.json() : { data: [] };
				const pendingData = pendingRes.ok
					? await pendingRes.json()
					: { data: [] };

				setStats({
					totalAssets: statsData.totalAssets || 0,
					inReview: statsData.inReview || 0,
					approved: statsData.approved || 0,
					totalDeliveries: deliveriesData.data?.length || 0,
				});

				setRecentLogs((logsData.data || []).slice(0, 5));
				setPendingAssets(pendingData.data || []);
			} catch (err) {
				console.error(err);
				setError("Unable to connect to the Kevlar API.");
			} finally {
				setIsLoading(false);
			}
		}

		loadDashboardData();
	}, [getToken]);

	const statCards = [
		{
			name: "Total Assets",
			value: stats.totalAssets,
			icon: FolderKanban,
			color: "text-blue-500",
			bg: "bg-blue-500/10",
		},
		{
			name: "In Review",
			value: stats.inReview,
			icon: Clock,
			color: "text-yellow-500",
			bg: "bg-yellow-500/10",
		},
		{
			name: "Approved",
			value: stats.approved,
			icon: CheckCircle2,
			color: "text-emerald-500",
			bg: "bg-emerald-500/10",
		},
		{
			name: "Deliveries",
			value: stats.totalDeliveries,
			icon: ShieldCheck,
			color: "text-purple-500",
			bg: "bg-purple-500/10",
		},
	];

	if (isLoading) {
		return (
			<div className="flex h-[400px] items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="space-y-6 max-w-7xl mx-auto">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
					<p className="text-muted-foreground mt-1">
						Overview of your Kevlar DAM environment.
					</p>
				</div>
				<Button className="gap-2" onClick={() => router.push("/assets")}>
					<UploadCloud className="w-4 h-4" /> Upload Asset
				</Button>
			</div>

			{error && (
				<div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md flex items-center gap-3 text-red-500">
					<AlertCircle className="w-5 h-5" />
					<p className="text-sm font-medium">{error}</p>
				</div>
			)}

			{/* THE BENTO GRID */}
			<div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
				{/* TOP ROW: Stats (Spans 1 column each on large screens) */}
				<div className="md:col-span-4 lg:col-span-6 grid grid-cols-2 md:grid-cols-4 gap-4">
					{statCards.map((stat) => (
						<Card
							key={stat.name}
							className="bg-card border-border hover:border-primary/50 transition-colors"
						>
							<CardHeader className="flex flex-row items-center justify-between pb-2">
								<CardTitle className="text-sm font-medium text-muted-foreground">
									{stat.name}
								</CardTitle>
								<div className={`p-2 rounded-md ${stat.bg}`}>
									<stat.icon className={`w-4 h-4 ${stat.color}`} />
								</div>
							</CardHeader>
							<CardContent>
								<div className="text-3xl font-bold">{stat.value}</div>
							</CardContent>
						</Card>
					))}
				</div>

				{/* MIDDLE LEFT: Pending Approvals (Spans 4 columns) */}
				<Card className="md:col-span-2 lg:col-span-4 flex flex-col border-border bg-card">
					<CardHeader className="border-b border-border/50 pb-4">
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="text-lg flex items-center gap-2">
									<Clock className="w-4 h-4 text-yellow-500" /> Action Required
								</CardTitle>
								<CardDescription>
									Assets awaiting manager approval
								</CardDescription>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => router.push("/assets")}
							>
								View All <ArrowRight className="w-4 h-4 ml-2" />
							</Button>
						</div>
					</CardHeader>
					<CardContent className="flex-1 p-0">
						{pendingAssets.length === 0 ? (
							<div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
								<CheckCircle2 className="w-8 h-8 mb-2 opacity-20" />
								<p className="text-sm">Inbox Zero! No assets pending review.</p>
							</div>
						) : (
							<div className="divide-y divide-border/50">
								{pendingAssets.map((asset) => (
									<div
										key={asset._id}
										className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
									>
										<div>
											<p className="font-medium text-sm">
												{asset.title || "Untitled Asset"}
											</p>
											<p className="text-xs text-muted-foreground font-mono mt-1">
												ID: {asset._id}
											</p>
										</div>
										<Button
											variant="outline"
											size="sm"
											onClick={() => router.push(`/assets/${asset._id}`)}
										>
											Review
										</Button>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* MIDDLE RIGHT: Recent Activity (Spans 2 columns) */}
				<Card className="md:col-span-2 lg:col-span-2 flex flex-col border-border bg-card">
					<CardHeader className="border-b border-border/50 pb-4">
						<CardTitle className="text-lg flex items-center gap-2">
							<Activity className="w-4 h-4 text-blue-500" /> Recent Activity
						</CardTitle>
						<CardDescription>Latest system events</CardDescription>
					</CardHeader>
					<CardContent className="p-0">
						<div className="divide-y divide-border/50">
							{recentLogs.map((log) => (
								<div
									key={log._id}
									className="p-4 hover:bg-muted/20 transition-colors"
								>
									<div className="flex items-center justify-between mb-1">
										<Badge
											variant="outline"
											className="text-[10px] bg-muted/50"
										>
											{log.action.replace(/_/g, " ")}
										</Badge>
										<span className="text-[10px] text-muted-foreground">
											{new Date(log.createdAt).toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit",
											})}
										</span>
									</div>
									<p className="text-xs text-muted-foreground truncate">
										<span className="font-medium text-foreground">
											{log.actorId}
										</span>{" "}
										modified{" "}
										<span className="font-mono">
											{log.assetFamilyId?.substring(0, 8)}...
										</span>
									</p>
								</div>
							))}
						</div>
						<div className="p-2 border-t border-border/50">
							<Button
								variant="ghost"
								size="sm"
								className="w-full text-xs text-muted-foreground"
								onClick={() => router.push("/audit")}
							>
								See Full Audit Trail
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
