"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	LineChart,
	Line,
	PieChart,
	Pie,
	Cell,
} from "recharts";
import { Package, CheckCircle, Link, Download, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PERIODS = [
	{ value: "7d", label: "7 Days" },
	{ value: "30d", label: "30 Days" },
	{ value: "90d", label: "90 Days" },
	{ value: "all", label: "All Time" },
];

const STATUS_COLORS = {
	DRAFT: "#6b7280",
	IN_REVIEW: "#f59e0b",
	APPROVED: "#10b981",
	PUBLISHED: "#3b82f6",
	REJECTED: "#ef4444",
	ARCHIVED: "#8b5cf6",
};

const formatUserId = (userId) => {
	if (!userId) return "Unknown";
	if (userId.length > 12) return `${userId.slice(0, 8)}...${userId.slice(-4)}`;
	return userId;
};

export default function AnalyticsPage() {
	const { getToken } = useAuth();
	const [period, setPeriod] = useState("30d");
	const [isLoading, setIsLoading] = useState(true);
	const [data, setData] = useState({
		overview: null,
		trends: null,
		employees: null,
		topCreators: null,
		topApprovers: null,
	});

	useEffect(() => {
		async function fetchAnalytics() {
			setIsLoading(true);
			try {
				const token = await getToken();
				const headers = { Authorization: `Bearer ${token}` };

				const fetchJson = async (url) => {
					const res = await fetch(url, { headers });
					if (!res.ok) throw new Error(`HTTP ${res.status}`);
					const json = await res.json();
					if (json.error) throw new Error(json.error);
					return json;
				};

				const [overview, trends, employees, topCreators, topApprovers] =
					await Promise.all([
						fetchJson(
							`${process.env.NEXT_PUBLIC_API_URL}/analytics/overview?period=${period}`,
						),
						fetchJson(
							`${process.env.NEXT_PUBLIC_API_URL}/analytics/trends?period=${period}`,
						),
						fetchJson(
							`${process.env.NEXT_PUBLIC_API_URL}/analytics/employees?period=${period}`,
						),
						fetchJson(
							`${process.env.NEXT_PUBLIC_API_URL}/analytics/top-creators?period=${period}`,
						),
						fetchJson(
							`${process.env.NEXT_PUBLIC_API_URL}/analytics/top-approvers?period=${period}`,
						),
					]);

				setData({
					overview,
					trends,
					employees,
					topCreators,
					topApprovers,
				});
				console.log(topApprovers);
			} catch (err) {
				console.error("Failed to fetch analytics", err);
			} finally {
				setIsLoading(false);
			}
		}

		fetchAnalytics();
	}, [getToken, period]);

	if (isLoading) {
		return (
			<div className="flex h-[400px] items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	const { overview, trends, employees, topCreators, topApprovers } = data;

	const statusPieData = overview?.statusBreakdown
		? Object.entries(overview.statusBreakdown).map(([status, count]) => ({
				name: status.replace("_", " "),
				value: count,
				color: STATUS_COLORS[status] || "#6b7280",
			}))
		: [];

	const hasTrendsData = trends?.assets && trends.assets.length > 0;
	const hasCreatorsData = topCreators && topCreators.length > 0;
	const hasApproversData = topApprovers && topApprovers.length > 0;

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
					<p className="text-muted-foreground mt-1">
						Monitor productivity and asset metrics
					</p>
				</div>
				<div className="flex gap-2">
					{PERIODS.map((p) => (
						<Button
							key={p.value}
							variant={period === p.value ? "default" : "outline"}
							size="sm"
							onClick={() => setPeriod(p.value)}
						>
							{p.label}
						</Button>
					))}
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Assets</CardTitle>
						<Package className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{overview?.totalAssets || 0}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Approvals</CardTitle>
						<CheckCircle className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{overview?.statusBreakdown?.APPROVED || 0}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Share Links</CardTitle>
						<Link className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{overview?.totalDeliveries || 0}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Downloads</CardTitle>
						<Download className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{overview?.totalDownloads || 0}
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Assets by Status</CardTitle>
					</CardHeader>
					<CardContent style={{ height: 300 }}>
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={statusPieData}
									cx="50%"
									cy="50%"
									innerRadius={60}
									outerRadius={100}
									paddingAngle={2}
									dataKey="value"
									label={({ name, value }) => `${name}: ${value}`}
								>
									{statusPieData.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={entry.color} />
									))}
								</Pie>
								<Tooltip />
							</PieChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Assets Created Over Time</CardTitle>
					</CardHeader>
					<CardContent style={{ height: 300 }}>
						{hasTrendsData ? (
							<ResponsiveContainer width="100%" height="100%">
								<LineChart data={trends?.assets || []}>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis
										dataKey="date"
										tick={{ fontSize: 10 }}
										tickFormatter={(value) => {
											const d = new Date(value);
											return `${d.getMonth() + 1}/${d.getDate()}`;
										}}
									/>
									<YAxis tick={{ fontSize: 10 }} />
									<Tooltip />
									<Line
										type="monotone"
										dataKey="count"
										stroke="#3b82f6"
										strokeWidth={2}
										name="Assets"
									/>
								</LineChart>
							</ResponsiveContainer>
						) : (
							<div className="flex items-center justify-center h-full text-muted-foreground">
								No trend data available
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Top Creators</CardTitle>
					</CardHeader>
					<CardContent style={{ height: 300 }}>
						{hasCreatorsData ? (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart
									data={(topCreators || []).map((c) => ({
										name: formatUserId(c.userId),
										count: c.count,
									}))}
									layout="vertical"
								>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis type="number" tick={{ fontSize: 10 }} />
									<YAxis
										type="category"
										dataKey="name"
										width={100}
										tick={{ fontSize: 10 }}
									/>
									<Tooltip />
									<Bar dataKey="count" fill="#3b82f6" />
								</BarChart>
							</ResponsiveContainer>
						) : (
							<div className="flex items-center justify-center h-full text-muted-foreground">
								No creator data available
							</div>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Top Approvers</CardTitle>
					</CardHeader>
					<CardContent style={{ height: 300 }}>
						{hasApproversData ? (
							<ResponsiveContainer width="100%" height="100%">
								<BarChart
									data={(topApprovers || []).map((c) => ({
										name: formatUserId(c.userId),
										count: c.count,
									}))}
									layout="vertical"
								>
									<CartesianGrid strokeDasharray="3 3" />
									<XAxis type="number" tick={{ fontSize: 10 }} />
									<YAxis
										type="category"
										dataKey="name"
										width={100}
										tick={{ fontSize: 10 }}
									/>
									<Tooltip />
									<Bar dataKey="count" fill="#10b981" />
								</BarChart>
							</ResponsiveContainer>
						) : (
							<div className="flex items-center justify-center h-full text-muted-foreground">
								No approver data available
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Employee Breakdown</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b">
									<th className="px-4 py-2 text-left font-medium">User ID</th>
									<th className="px-4 py-2 text-right font-medium">
										Assets Created
									</th>
									<th className="px-4 py-2 text-right font-medium">
										Assets Approved
									</th>
									<th className="px-4 py-2 text-right font-medium">
										Versions Uploaded
									</th>
									<th className="px-4 py-2 text-right font-medium">
										Links Created
									</th>
								</tr>
							</thead>
							<tbody>
								{(employees || []).length === 0 ? (
									<tr>
										<td
											colSpan={5}
											className="px-4 py-8 text-center text-muted-foreground"
										>
											No data available
										</td>
									</tr>
								) : (
									(employees || []).map((emp) => (
										<tr key={emp.userId} className="border-b hover:bg-muted/30">
											<td className="px-4 py-2 font-mono text-xs">
												{formatUserId(emp.userId)}
											</td>
											<td className="px-4 py-2 text-right">
												{emp.assetsCreated}
											</td>
											<td className="px-4 py-2 text-right">
												{emp.assetsApproved}
											</td>
											<td className="px-4 py-2 text-right">
												{emp.versionsUploaded}
											</td>
											<td className="px-4 py-2 text-right">
												{emp.linksCreated}
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
