"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	FolderKanban,
	ShieldCheck,
	Clock,
	CheckCircle2,
	Loader2,
	AlertCircle,
} from "lucide-react";

export default function DashboardPage() {
	const { getToken } = useAuth();
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [stats, setStats] = useState({
		totalAssets: 0,
		inReview: 0,
		approved: 0,
		totalDeliveries: 0,
	});

	useEffect(() => {
		async function loadStats() {
			try {
				const token = await getToken();
				const res = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"}/assets/stats/overview`,
					{
						headers: { Authorization: `Bearer ${token}` },
					},
				);

				if (!res.ok) throw new Error("Failed to load dashboard statistics");

				const data = await res.json();
				setStats({
					totalAssets: data.totalAssets || 0,
					inReview: data.inReview || 0,
					approved: data.approved || 0,
					totalDeliveries: data.totalDeliveries || 0,
				});
			} catch (err) {
				console.error(err);
				setError("Unable to connect to the Kevlar API.");
			} finally {
				setIsLoading(false);
			}
		}
		loadStats();
	}, [getToken]);

	const statCards = [
		{
			name: "Total Assets",
			value: stats.totalAssets,
			icon: FolderKanban,
			color: "text-blue-500",
		},
		{
			name: "In Review",
			value: stats.inReview,
			icon: Clock,
			color: "text-yellow-500",
		},
		{
			name: "Approved",
			value: stats.approved,
			icon: CheckCircle2,
			color: "text-emerald-500",
		},
		{
			name: "Active Deliveries",
			value: stats.totalDeliveries,
			icon: ShieldCheck,
			color: "text-purple-500",
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
		<div className="space-y-8 max-w-7xl mx-auto">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Kevlar Dashboard</h1>
				<p className="text-muted-foreground mt-1">
					Overview of your Kevlar DAM environment.
				</p>
			</div>

			{error && (
				<div className="p-4 bg-red-500/10 border border-red-500/20 rounded-md flex items-center gap-3 text-red-500">
					<AlertCircle className="w-5 h-5" />
					<p className="text-sm font-medium">{error}</p>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				{statCards.map((stat) => (
					<Card
						key={stat.name}
						className="bg-card border-border hover:border-primary/50 transition-colors"
					>
						<CardHeader className="flex flex-row items-center justify-between pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								{stat.name}
							</CardTitle>
							<stat.icon className={`w-4 h-4 ${stat.color}`} />
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-bold">{stat.value}</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}
