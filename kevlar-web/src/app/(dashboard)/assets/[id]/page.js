"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import {
	ArrowLeft,
	Download,
	FileText,
	Image as ImageIcon,
	Video,
	Clock,
	History,
	Loader2,
	ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const getStatusBadge = (status) => {
	switch (status) {
		case "APPROVED":
			return (
				<Badge variant="default" className="bg-green-600">
					Approved
				</Badge>
			);
		case "IN_REVIEW":
			return (
				<Badge variant="secondary" className="text-yellow-500">
					In Review
				</Badge>
			);
		case "DRAFT":
			return <Badge variant="outline">Draft</Badge>;
		default:
			return <Badge variant="outline">{status}</Badge>;
	}
};

const getIcon = (type) => {
	if (!type) return <FileText className="w-16 h-16 text-muted-foreground/50" />;
	if (type.startsWith("video/"))
		return <Video className="w-16 h-16 text-muted-foreground/50" />;
	if (type.startsWith("image/"))
		return <ImageIcon className="w-16 h-16 text-muted-foreground/50" />;
	return <FileText className="w-16 h-16 text-muted-foreground/50" />;
};

export default function AssetDetailsPage() {
	const params = useParams();
	const router = useRouter();
	const { getToken } = useAuth();

	const [family, setFamily] = useState(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		async function loadAssetDetails() {
			try {
				const token = await getToken();
				const res = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"}/assets/${params.id}`,
					{
						headers: { Authorization: `Bearer ${token}` },
					},
				);

				if (!res.ok) throw new Error("Asset not found");
				const data = await res.json();
				setFamily(data);
			} catch (err) {
				console.error(err);
			} finally {
				setIsLoading(false);
			}
		}
		loadAssetDetails();
	}, [params.id, getToken]);

	const handleDownload = async () => {
		try {
			const token = await getToken();
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"}/delivery/share`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ familyId: params.id, expiresInHours: 1 }),
				},
			);

			if (!res.ok)
				throw new Error(
					"Failed to generate secure link. Ensure asset is approved.",
				);
			const data = await res.json();
			window.open(data.secureUrl, "_blank");
		} catch (err) {
			alert(err.message);
		}
	};

	if (isLoading) {
		return (
			<div className="flex h-[600px] items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!family) return <div>Asset not found.</div>;

	// Derive metadata from the active version or latest draft
	const latestVersion = family.versions?.[0] || {};
	const displayTitle =
		family.title || latestVersion.originalFilename || "Untitled Asset";
	const mimeType = latestVersion.mimeType || "unknown";

	return (
		<div className="space-y-8 max-w-5xl mx-auto">
			{/* Top Navigation */}
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" onClick={() => router.back()}>
					<ArrowLeft className="w-4 h-4" />
				</Button>
				<div>
					<h1 className="text-3xl font-bold tracking-tight">{displayTitle}</h1>
					<p className="text-muted-foreground mt-1 flex items-center gap-2">
						Family ID: <span className="font-mono text-xs">{family._id}</span>
					</p>
				</div>
				<div className="ml-auto flex gap-3">
					{getStatusBadge(family.status)}
					<Button
						onClick={handleDownload}
						disabled={family.status !== "APPROVED"}
						className="gap-2"
					>
						<Download className="w-4 h-4" />
						Download Active
					</Button>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{/* Main Content Area */}
				<div className="md:col-span-2 space-y-6">
					<Card className="overflow-hidden border-border bg-card">
						<div className="aspect-video bg-muted flex items-center justify-center border-b border-border">
							{getIcon(mimeType)}
						</div>
						<CardContent className="p-6">
							<h3 className="text-lg font-semibold mb-4">Metadata</h3>
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<p className="text-muted-foreground mb-1">File Type</p>
									<p className="font-medium">{mimeType}</p>
								</div>
								<div>
									<p className="text-muted-foreground mb-1">Total Versions</p>
									<p className="font-medium">{family.versions?.length || 0}</p>
								</div>
								<div>
									<p className="text-muted-foreground mb-1">Size (Latest)</p>
									<p className="font-medium">
										{(latestVersion.sizeBytes / 1024 / 1024).toFixed(2)} MB
									</p>
								</div>
								<div>
									<p className="text-muted-foreground mb-1">Last Modified</p>
									<p className="font-medium">
										{new Date(family.updatedAt).toLocaleDateString()}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Sidebar - Version Control Timeline */}
				<div className="space-y-6">
					<Card className="border-border bg-card">
						<CardHeader className="pb-3 border-b border-border">
							<CardTitle className="flex items-center gap-2 text-lg">
								<History className="w-5 h-5 text-muted-foreground" />
								Version History
							</CardTitle>
						</CardHeader>
						<CardContent className="p-0">
							<div className="flex flex-col">
								{family.versions?.map((v, idx) => (
									<div
										key={v._id}
										className="p-4 border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
									>
										<div className="flex justify-between items-start mb-1">
											<span className="font-semibold text-sm">
												Version {v.versionNumber}
											</span>
											{family.activeVersionId === v._id && (
												<Badge
													variant="secondary"
													className="text-xs bg-blue-500/10 text-blue-500"
												>
													Active
												</Badge>
											)}
										</div>
										<p className="text-xs text-muted-foreground font-mono truncate">
											{v.minioObjectKey.split("/").pop()}
										</p>
										<p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
											<Clock className="w-3 h-3" />{" "}
											{new Date(v.createdAt).toLocaleDateString()}
										</p>
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					<Card className="border-border bg-card">
						<CardContent className="p-4 flex items-start gap-3">
							<ShieldCheck className="w-8 h-8 text-blue-500 shrink-0" />
							<div>
								<h4 className="font-semibold text-sm">Kevlar DRM Protected</h4>
								<p className="text-xs text-muted-foreground mt-1">
									Downloads generate expiring, secure proxies.
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
