"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { History, Search, Filter, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function AuditLogsPage() {
	const { getToken } = useAuth();
	const [logs, setLogs] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState("");

	useEffect(() => {
		async function fetchLogs() {
			try {
				const token = await getToken();
				const res = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"}/audit`,
					{
						headers: { Authorization: `Bearer ${token}` },
					},
				);
				const data = await res.json();
				setLogs(data.data || []);
			} catch (err) {
				console.error("Failed to fetch audit logs", err);
			} finally {
				setIsLoading(false);
			}
		}
		fetchLogs();
	}, [getToken]);

	const getActionBadge = (action) => {
		const styles = {
			ASSET_CREATED: "bg-blue-500/10 text-blue-500",
			ASSET_UPDATED: "bg-amber-500/10 text-amber-500",
			WORKFLOW_STATE_CHANGED: "bg-purple-500/10 text-purple-500",
			DELIVERY_CREATED: "bg-emerald-500/10 text-emerald-500",
		};
		return (
			<Badge variant="outline" className={styles[action] || ""}>
				{action.replace(/_/g, " ")}
			</Badge>
		);
	};

	const filteredLogs = logs.filter((log) => {
		if (!searchQuery) return true;

		const query = searchQuery.toLowerCase();

		const matchActor = (log.actorId || "System").toLowerCase().includes(query);
		const matchAction = (log.action || "").toLowerCase().includes(query);
		const matchTarget = (log.assetFamilyId || "").toLowerCase().includes(query);
		const matchDetails = JSON.stringify(log.metadata || {})
			.toLowerCase()
			.includes(query);

		return matchActor || matchAction || matchTarget || matchDetails;
	});

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
				<p className="text-muted-foreground mt-1">
					Traceability for every asset and system action.
				</p>
			</div>

			<Card className="border-border bg-card">
				<CardHeader className="border-b border-border py-4">
					<div className="flex items-center justify-between">
						<div className="relative w-72">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
							<Input
								placeholder="Filter by actor, action, or target..."
								className="pl-10"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
						</div>
					</div>
				</CardHeader>
				<CardContent className="p-0">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-border bg-muted/30 text-muted-foreground uppercase text-[10px] tracking-wider">
								<th className="px-6 py-3 text-left font-medium">Timestamp</th>
								<th className="px-6 py-3 text-left font-medium">Actor</th>
								<th className="px-6 py-3 text-left font-medium">Action</th>
								<th className="px-6 py-3 text-left font-medium">Target</th>
								<th className="px-6 py-3 text-left font-medium">Details</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-border">
							{isLoading ? (
								<tr>
									<td colSpan="5" className="py-20 text-center">
										<Loader2 className="animate-spin inline mr-2" /> Loading
										logs...
									</td>
								</tr>
							) : filteredLogs.length === 0 ? (
								<tr>
									<td
										colSpan="5"
										className="py-20 text-center text-muted-foreground"
									>
										No logs match your filter.
									</td>
								</tr>
							) : (
								filteredLogs.map((log) => (
									<tr
										key={log._id}
										className="hover:bg-muted/30 transition-colors"
									>
										<td className="px-6 py-4 whitespace-nowrap text-muted-foreground font-mono text-xs">
											{new Date(log.createdAt).toLocaleString()}
										</td>
										<td className="px-6 py-4 font-medium">
											{log.actorId || "System"}
										</td>
										<td className="px-6 py-4">{getActionBadge(log.action)}</td>
										<td className="px-6 py-4 font-mono text-[10px] opacity-70">
											{log.assetFamilyId || "-"}
										</td>
										<td className="px-6 py-4 text-muted-foreground">
											<pre className="text-[10px] truncate max-w-[200px]">
												{log.metadata && Object.keys(log.metadata).length > 0
													? JSON.stringify(log.metadata)
													: "—"}
											</pre>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</CardContent>
			</Card>
		</div>
	);
}
