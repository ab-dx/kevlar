"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import {
	Plus,
	Image as ImageIcon,
	Video,
	FileText,
	MoreHorizontal,
	Loader2,
	FolderKanban,
	SlidersHorizontal,
	Tag,
	UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";

const getStatusBadge = (status) => {
	switch (status) {
		case "APPROVED":
			return (
				<Badge variant="default" className="bg-green-600 hover:bg-green-700">
					Approved
				</Badge>
			);
		case "IN_REVIEW":
			return (
				<Badge
					variant="secondary"
					className="bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30"
				>
					In Review
				</Badge>
			);
		case "DRAFT":
			return (
				<Badge variant="outline" className="text-muted-foreground">
					Draft
				</Badge>
			);
		default:
			return <Badge variant="outline">{status}</Badge>;
	}
};

const getIcon = (type) => {
	if (!type) return <FileText className="w-8 h-8 text-muted-foreground/50" />;
	if (type.startsWith("video/"))
		return <Video className="w-8 h-8 text-muted-foreground/50" />;
	if (type.startsWith("image/"))
		return <ImageIcon className="w-8 h-8 text-muted-foreground/50" />;
	return <FileText className="w-8 h-8 text-muted-foreground/50" />;
};

function AssetGrid() {
	const { getToken } = useAuth();
	const router = useRouter();
	const searchParams = useSearchParams();
	const urlQuery = searchParams.get("q");

	// --- STATE ---
	const [assets, setAssets] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadModalOpen, setUploadModalOpen] = useState(false);

	// Filters
	const [searchQuery, setSearchQuery] = useState(urlQuery || "");
	const [statusFilter, setStatusFilter] = useState("all");
	const [typeFilter, setTypeFilter] = useState("all");
	const [tagFilter, setTagFilter] = useState("");

	// Sync Header Search
	useEffect(() => {
		if (urlQuery !== null) setSearchQuery(urlQuery);
	}, [urlQuery]);

	// --- DATA FETCHING ---
	const loadAssets = async () => {
		setIsLoading(true);
		try {
			const token = await getToken();
			const url = new URL(
				`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"}/assets`,
			);

			// Apply all filters to the URL
			if (searchQuery) url.searchParams.append("q", searchQuery);
			if (statusFilter !== "all")
				url.searchParams.append("status", statusFilter);
			if (typeFilter !== "all") url.searchParams.append("type", typeFilter);
			if (tagFilter) url.searchParams.append("tags", tagFilter);

			const res = await fetch(url, {
				headers: { Authorization: `Bearer ${token}` },
			});
			if (!res.ok) throw new Error("Failed to fetch assets");
			const json = await res.json();
			setAssets(json.data || []);
		} catch (err) {
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		const debounce = setTimeout(() => {
			loadAssets();
		}, 300);
		return () => clearTimeout(debounce);
	}, [searchQuery, statusFilter, typeFilter, tagFilter, getToken]);

	// --- ACTIONS ---
	const handleUploadSubmit = async (e) => {
		e.preventDefault();
		setIsUploading(true);

		const formData = new FormData(e.target);
		const title = formData.get("title");
		const tagsInput = formData.get("tags");
		const file = formData.get("file");

		const tags = tagsInput
			? tagsInput
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean)
			: [];

		try {
			const token = await getToken();
			const apiBase =
				process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

			// STEP 1: Init - Get the Presigned URL from NestJS
			const initRes = await fetch(`${apiBase}/assets/upload/init`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					filename: file.name,
					mimeType: file.type,
					sizeBytes: file.size,
				}),
			});

			if (!initRes.ok) {
				const errorData = await initRes.json();
				console.error("NestJS Error:", errorData);
				throw new Error(
					`Backend rejected init: ${errorData.message || errorData.error}`,
				);
			}
			// const response = await initRes.json();
			const { uploadUrl, objectKey } = await initRes.json();

			// STEP 2: Direct Upload - Push bytes directly to MinIO (Bypassing NestJS)
			const uploadRes = await fetch(uploadUrl, {
				method: "PUT",
				headers: {
					"Content-Type": file.type,
				},
				body: file,
			});

			if (!uploadRes.ok) throw new Error("Failed to upload file to storage");
			const assetType = file.type.startsWith("video/")
				? "video"
				: file.type.startsWith("image/")
					? "image"
					: "document";
			// STEP 3: Complete - Tell NestJS to finalize the DB records
			const completeRes = await fetch(`${apiBase}/assets/upload/complete`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					originalFilename: file.name,
					minioObjectKey: objectKey,
					mimeType: file.type,
					sizeBytes: file.size,
					assetType: assetType,
					title: title,
					tags: tags,
				}),
			});

			if (!completeRes.ok) throw new Error("Failed to finalize asset creation");

			setUploadModalOpen(false);
			loadAssets(); // Refresh grid to show the new asset
		} catch (err) {
			alert(err.message);
		} finally {
			setIsUploading(false);
		}
	};

	const handleDownload = async (familyId) => {
		try {
			const token = await getToken();
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/delivery/share`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ familyId, expiresInHours: 1 }),
				},
			);
			if (!res.ok) throw new Error("Failed to generate download link");
			const data = await res.json();
			window.open(data.secureUrl, "_blank");
		} catch (err) {
			alert(err.message);
		}
	};

	const handleDelete = async (familyId) => {
		if (!confirm("Delete this asset family?")) return;
		try {
			const token = await getToken();
			await fetch(`${process.env.NEXT_PUBLIC_API_URL}/assets/${familyId}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${token}` },
			});
			setAssets((prev) => prev.filter((a) => a._id !== familyId));
		} catch (err) {
			console.error(err);
		}
	};

	return (
		<div className="space-y-6 h-full flex flex-col">
			{/* Header & Upload Action */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Asset Library</h1>
					<p className="text-muted-foreground mt-1">
						Manage, tag, and approve your files.
					</p>
				</div>

				{/* THE UPLOAD MODAL */}
				<Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
					<DialogTrigger asChild>
						<Button className="shrink-0 gap-2">
							<UploadCloud className="w-4 h-4" />
							Upload Asset
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-[425px]">
						<form onSubmit={handleUploadSubmit}>
							<DialogHeader>
								<DialogTitle>Upload New Asset</DialogTitle>
								<DialogDescription>
									Upload a file to create a new Asset Family. You can add more
									versions later.
								</DialogDescription>
							</DialogHeader>
							<div className="grid gap-4 py-4">
								<div className="space-y-2">
									<Label htmlFor="title">Asset Title</Label>
									<Input
										id="title"
										name="title"
										placeholder="e.g. Q4 Marketing Video"
										required
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="tags">Tags (comma separated)</Label>
									<Input
										id="tags"
										name="tags"
										placeholder="marketing, 2026, social"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="file">File</Label>
									<Input
										id="file"
										name="file"
										type="file"
										required
										className="cursor-pointer"
									/>
								</div>
							</div>
							<DialogFooter>
								<Button
									type="button"
									variant="outline"
									onClick={() => setUploadModalOpen(false)}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={isUploading}>
									{isUploading && (
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									)}
									{isUploading ? "Uploading..." : "Create Asset"}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</div>

			{/* The Search & Filter Bar */}
			<div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-2 rounded-lg border border-border">
				<div className="flex-1 w-full relative">
					<Input
						placeholder="Search by filename or title..."
						className="border-0 shadow-none bg-transparent focus-visible:ring-0"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>
				<div className="h-6 w-[1px] bg-border hidden sm:block"></div>

				<div className="flex items-center gap-2 w-full sm:w-auto">
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-full sm:w-[140px] border-0 shadow-none bg-transparent focus:ring-0">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Statuses</SelectItem>
							<SelectItem value="DRAFT">Drafts</SelectItem>
							<SelectItem value="IN_REVIEW">In Review</SelectItem>
							<SelectItem value="APPROVED">Approved</SelectItem>
						</SelectContent>
					</Select>

					{/* ADVANCED FILTERS SLIDE-OUT */}
					<Sheet>
						<SheetTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="text-muted-foreground relative"
							>
								<SlidersHorizontal className="w-4 h-4" />
								{(typeFilter !== "all" || tagFilter !== "") && (
									<span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
								)}
							</Button>
						</SheetTrigger>
						<SheetContent className="p-4">
							<SheetHeader>
								<SheetTitle>Advanced Filters</SheetTitle>
								<SheetDescription>
									Narrow down your asset library.
								</SheetDescription>
							</SheetHeader>
							<div className="grid gap-6 py-6">
								<div className="space-y-2">
									<Label>File Type</Label>
									<Select value={typeFilter} onValueChange={setTypeFilter}>
										<SelectTrigger>
											<SelectValue placeholder="Select type" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All Types</SelectItem>
											<SelectItem value="image">Images</SelectItem>
											<SelectItem value="video">Videos</SelectItem>
											<SelectItem value="document">Documents</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Tags</Label>
									<div className="relative">
										<Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
										<Input
											placeholder="e.g. campaign, logo..."
											className="pl-9"
											value={tagFilter}
											onChange={(e) => setTagFilter(e.target.value)}
										/>
									</div>
									<p className="text-xs text-muted-foreground mt-1">
										Separate multiple tags with commas.
									</p>
								</div>
								<Button
									variant="outline"
									className="w-full mt-4"
									onClick={() => {
										setTypeFilter("all");
										setTagFilter("");
									}}
								>
									Clear Filters
								</Button>
							</div>
						</SheetContent>
					</Sheet>
				</div>
			</div>

			{/* Grid Rendering */}
			{isLoading ? (
				<div className="flex-1 flex items-center justify-center min-h-[400px]">
					<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
				</div>
			) : assets.length === 0 ? (
				<div className="flex-1 flex flex-col items-center justify-center min-h-[400px] border border-dashed border-border rounded-xl">
					<FolderKanban className="w-12 h-12 text-muted-foreground/50 mb-4" />
					<h3 className="text-lg font-medium">No assets found</h3>
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
					{assets.map((family) => {
						const activeVersion = family.activeVersionId || {};
						const mimeType = activeVersion.mimeType || "unknown";
						const displayTitle =
							family.title ||
							activeVersion.originalFilename ||
							"Untitled Asset";
						// Fallback for tags if backend doesn't return them yet
						const tags = family.tags || [];

						return (
							<Card
								key={family._id}
								className="group overflow-hidden flex flex-col hover:border-primary/50 transition-colors cursor-pointer"
							>
								<div
									className="aspect-video bg-muted flex items-center justify-center relative"
									onClick={() => router.push(`/assets/${family._id}`)}
								>
									{getIcon(mimeType)}
									<div className="absolute top-2 right-2">
										{getStatusBadge(family.status)}
									</div>
								</div>

								<CardContent className="p-4 flex-1">
									<div className="flex items-start justify-between gap-2">
										<div onClick={() => router.push(`/assets/${family._id}`)}>
											<h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
												{displayTitle}
											</h3>
											<p className="text-xs text-muted-foreground mt-1">
												Updated{" "}
												{new Date(family.updatedAt).toLocaleDateString()}
											</p>
										</div>

										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="h-8 w-8 -mr-2"
												>
													<MoreHorizontal className="w-4 h-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem
													onClick={() => router.push(`/assets/${family._id}`)}
												>
													View Details
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => handleDownload(family._id)}
												>
													Download Active
												</DropdownMenuItem>
												<DropdownMenuItem
													className="text-destructive"
													onClick={() => handleDelete(family._id)}
												>
													Delete Family
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>

									{/* VISUAL TAG RENDERING */}
									{tags.length > 0 && (
										<div className="flex flex-wrap gap-1 mt-3">
											{tags.slice(0, 3).map((tag, idx) => (
												<Badge
													key={idx}
													variant="secondary"
													className="text-[10px] px-1.5 py-0"
												>
													{tag}
												</Badge>
											))}
											{tags.length > 3 && (
												<Badge
													variant="secondary"
													className="text-[10px] px-1.5 py-0"
												>
													+{tags.length - 3}
												</Badge>
											)}
										</div>
									)}
								</CardContent>

								<CardFooter className="p-4 pt-0 flex items-center justify-between border-t border-border mt-auto">
									<div className="text-xs font-medium text-muted-foreground flex items-center gap-2">
										<span className="w-2 h-2 rounded-full bg-primary/50"></span>
										v{family.nextVersionNumber - 1 || 1} •{" "}
										{mimeType.split("/")[1]?.toUpperCase() || "FILE"}
									</div>
								</CardFooter>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}

export default function AssetsPage() {
	return (
		<Suspense
			fallback={
				<div className="flex h-full items-center justify-center">
					<Loader2 className="w-8 h-8 animate-spin" />
				</div>
			}
		>
			<AssetGrid />
		</Suspense>
	);
}
