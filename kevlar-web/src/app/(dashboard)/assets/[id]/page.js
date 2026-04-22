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
	ChevronDown,
	UploadCloud,
	Plus,
	Edit,
	Trash2,
	PlusCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
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
import { ShareLinkDialog } from "@/components/ui/share-link-dialog";

const getIcon = (type) => {
	if (!type) return <FileText className="w-16 h-16 text-muted-foreground/50" />;
	if (type.startsWith("video/"))
		return <Video className="w-16 h-16 text-muted-foreground/50" />;
	if (type.startsWith("image/"))
		return <ImageIcon className="w-16 h-16 text-muted-foreground/50" />;
	return <FileText className="w-16 h-16 text-muted-foreground/50" />;
};

const StatusDropdown = ({ status, onStatusChange, isLoading }) => {
	const statusConfig = {
		DRAFT: { label: "Draft", color: "bg-slate-500/20 text-slate-400" },
		IN_REVIEW: {
			label: "In Review",
			color: "bg-yellow-500/20 text-yellow-500",
		},
		REJECTED: { label: "Rejected", color: "bg-orange-500/20 text-orange-500" },
		APPROVED: {
			label: "Approved",
			color: "bg-emerald-500/20 text-emerald-500",
		},
		PUBLISHED: { label: "Published", color: "bg-blue-500 text-white" },
		ARCHIVED: { label: "Archived", color: "bg-red-500/20 text-red-500" },
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className={`gap-2 border-0 ${statusConfig[status]?.color}`}
					disabled={isLoading}
				>
					{statusConfig[status]?.label || status}
					<ChevronDown className="w-3 h-3 opacity-50" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{/* DRAFT -> [IN_REVIEW, ARCHIVED] */}
				{status === "DRAFT" && (
					<>
						<DropdownMenuItem onClick={() => onStatusChange("IN_REVIEW")}>
							Submit for Review
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => onStatusChange("ARCHIVED")}
							className="text-red-500"
						>
							Archive
						</DropdownMenuItem>
					</>
				)}

				{/* IN_REVIEW -> [APPROVED, REJECTED, DRAFT] */}
				{status === "IN_REVIEW" && (
					<>
						<DropdownMenuItem
							onClick={() => onStatusChange("APPROVED")}
							className="text-emerald-500 font-medium"
						>
							Approve
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => onStatusChange("REJECTED")}
							className="text-orange-500"
						>
							Reject
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => onStatusChange("DRAFT")}>
							Back to Draft
						</DropdownMenuItem>
					</>
				)}

				{/* REJECTED -> [DRAFT, ARCHIVED] */}
				{status === "REJECTED" && (
					<>
						<DropdownMenuItem onClick={() => onStatusChange("DRAFT")}>
							Reset to Draft
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => onStatusChange("ARCHIVED")}
							className="text-red-500"
						>
							Archive
						</DropdownMenuItem>
					</>
				)}

				{/* APPROVED -> [PUBLISHED, ARCHIVED] */}
				{status === "APPROVED" && (
					<>
						<DropdownMenuItem
							onClick={() => onStatusChange("PUBLISHED")}
							className="text-blue-500 font-medium"
						>
							Publish
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => onStatusChange("ARCHIVED")}
							className="text-red-500"
						>
							Archive
						</DropdownMenuItem>
					</>
				)}

				{/* PUBLISHED -> [ARCHIVED] */}
				{status === "PUBLISHED" && (
					<DropdownMenuItem
						onClick={() => onStatusChange("ARCHIVED")}
						className="text-red-500"
					>
						Archive
					</DropdownMenuItem>
				)}

				{/* ARCHIVED -> [DRAFT] */}
				{status === "ARCHIVED" && (
					<DropdownMenuItem onClick={() => onStatusChange("DRAFT")}>
						Restore to Draft
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export default function AssetDetailsPage() {
	const params = useParams();
	const router = useRouter();
	const { getToken } = useAuth();

	const [family, setFamily] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
	const [versionModalOpen, setVersionModalOpen] = useState(false);
	const [isUploadingVersion, setIsUploadingVersion] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [isUpdatingMetadata, setIsUpdatingMetadata] = useState(false);

	const [customMetaList, setCustomMetaList] = useState([]);

	const [shareDialogOpen, setShareDialogOpen] = useState(false);
	const [isGeneratingLink, setIsGeneratingLink] = useState(false);

	const handleOpenEditModal = () => {
		if (family.customMetadata) {
			setCustomMetaList(
				Object.entries(family.customMetadata).map(([k, v]) => ({
					key: k,
					value: v,
				})),
			);
		} else {
			setCustomMetaList([]);
		}
		setEditModalOpen(true);
	};

	const handleEditMetadataSubmit = async (e) => {
		e.preventDefault();
		setIsUpdatingMetadata(true);

		const formData = new FormData(e.target);
		const updatedTitle = formData.get("title");
		const updatedTags = formData
			.get("tags")
			.split(",")
			.map((tag) => tag.trim())
			.filter(Boolean);

		const customMetadataObj = {};
		customMetaList.forEach((item) => {
			if (item.key.trim()) customMetadataObj[item.key.trim()] = item.value;
		});

		try {
			const token = await getToken();
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/assets/${params.id}/metadata`,
				{
					method: "PATCH",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						title: updatedTitle,
						tags: updatedTags,
						customMetadata: customMetadataObj,
					}),
				},
			);

			if (!res.ok) throw new Error("Failed to update asset metadata");

			setEditModalOpen(false);
			await loadAssetDetails();
		} catch (err) {
			alert(err.message);
		} finally {
			setIsUpdatingMetadata(false);
		}
	};

	const loadAssetDetails = async () => {
		try {
			const token = await getToken();
			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1"}/assets/${params.id}`,
				{ headers: { Authorization: `Bearer ${token}` } },
			);
			if (!res.ok) throw new Error("Asset not found");
			const data = await res.json();
			setFamily(data);
		} catch (err) {
			console.error(err);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		loadAssetDetails();
	}, [params.id, getToken]);

	const handleStatusChange = async (newStatus) => {
		setIsUpdatingStatus(true);
		try {
			const token = await getToken();
			const notes =
				newStatus === "REJECTED"
					? prompt("Rejection Reason:")
					: "Updated via Dashboard";

			const res = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/assets/${params.id}/status`,
				{
					method: "PATCH",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ status: newStatus, notes }),
				},
			);

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "FSM Transition Failed");
			}
			await loadAssetDetails();
		} catch (err) {
			alert(err.message);
		} finally {
			setIsUpdatingStatus(false);
		}
	};

	const handleNewVersionSubmit = async (e) => {
		e.preventDefault();
		setIsUploadingVersion(true);
		const file = new FormData(e.target).get("file");

		try {
			const token = await getToken();
			const apiBase =
				process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

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

			if (!initRes.ok) throw new Error("Init failed");

			const initData = await initRes.json();
			const uploadUrl = initData.uploadUrl;
			const keyFromServer = initData.objectKey || initData.minioObjectKey;

			const uploadRes = await fetch(uploadUrl, {
				method: "PUT",
				headers: { "Content-Type": file.type },
				body: file,
			});
			if (!uploadRes.ok) throw new Error("Storage upload failed");

			const completeRes = await fetch(
				`${apiBase}/assets/${params.id}/versions/complete`,
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						originalFilename: file.name,
						minioObjectKey: keyFromServer,
						mimeType: file.type,
						sizeBytes: file.size,
						assetType: file.type.startsWith("video/") ? "video" : "image",
					}),
				},
			);

			if (!completeRes.ok) {
				const errorData = await completeRes.json();
				console.error("Version Complete Error:", errorData);
				throw new Error(errorData.message || "Failed to link new version");
			}

			setVersionModalOpen(false);
			await loadAssetDetails();
		} catch (err) {
			alert(err.message);
		} finally {
			setIsUploadingVersion(false);
		}
	};

	const generateShareLink = async (expiresInHours) => {
		setIsGeneratingLink(true);
		try {
			const token = await getToken();
			const apiBase =
				process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

			const res = await fetch(`${apiBase}/delivery/share`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					familyId: params.id,
					expiresInHours,
				}),
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.message || "Download access denied.");
			}

			const { secureUrl } = await res.json();

			window.open(secureUrl, "_blank");
			setShareDialogOpen(false);
		} catch (err) {
			alert(err.message);
		} finally {
			setIsGeneratingLink(false);
		}
	};

	if (isLoading)
		return (
			<div className="flex h-[600px] items-center justify-center">
				<Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
			</div>
		);
	if (!family) return <div>Asset not found.</div>;

	const activeVersion =
		family.versions?.find((v) => v._id === family.activeVersionId) ||
		family.versions?.[0] ||
		{};
	const displayTitle =
		family.title || activeVersion.originalFilename || "Untitled Asset";
	const mimeType = activeVersion.mimeType || "unknown";

	return (
		<div className="space-y-8 max-w-5xl mx-auto">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" onClick={() => router.back()}>
					<ArrowLeft className="w-4 h-4" />
				</Button>
				<div>
					<h1 className="text-3xl font-bold tracking-tight">{displayTitle}</h1>
					<p className="text-muted-foreground mt-1 text-xs font-mono">
						ID: {family._id}
					</p>
				</div>
				<div className="ml-auto flex gap-3">
					<StatusDropdown
						status={family.status}
						onStatusChange={handleStatusChange}
						isLoading={isUpdatingStatus}
					/>
					<ShareLinkDialog
						open={shareDialogOpen}
						onOpenChange={setShareDialogOpen}
						onConfirm={generateShareLink}
						isLoading={isGeneratingLink}
						trigger={
							<Button disabled={family.status !== "APPROVED"}>
								<Download className="mr-2 w-4 h-4" /> Download
							</Button>
						}
					/>
					<Button onClick={() => handleOpenEditModal()}>
						<Edit className="mr-2 w-4 h-4" /> Edit
					</Button>
				</div>
			</div>

			<Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
				{/* If you have a 3-dots actions dropdown, put this DropdownMenuItem inside it: */}
				{/* <DropdownMenuItem onClick={() => setEditModalOpen(true)}>Edit Tags & Title</DropdownMenuItem> */}

				<DialogContent>
					<form onSubmit={handleEditMetadataSubmit}>
						<DialogHeader>
							<DialogTitle>Edit Asset Metadata</DialogTitle>
						</DialogHeader>
						<div className="py-4 space-y-4">
							<div className="space-y-2">
								<Label>Title</Label>
								<Input
									name="title"
									defaultValue={family.title || ""}
									placeholder="Asset Title"
								/>
							</div>
							<div className="space-y-2">
								<Label>Tags (comma separated)</Label>
								<Input
									name="tags"
									defaultValue={(family.tags || []).join(", ")}
									placeholder="e.g. marketing, 2026, logo"
								/>
							</div>

							<div className="space-y-3 pt-4 border-t border-border">
								<div className="flex justify-between items-center">
									<Label>Custom Attributes</Label>
									<Button
										type="button"
										variant="ghost"
										size="sm"
										className="h-7 text-xs"
										onClick={() =>
											setCustomMetaList([
												...customMetaList,
												{ key: "", value: "" },
											])
										}
									>
										<Plus className="w-3 h-3 mr-1" /> Add Row
									</Button>
								</div>

								{customMetaList.map((item, index) => (
									<div key={index} className="flex items-center gap-2">
										<Input
											placeholder="Key (e.g. fps)"
											value={item.key}
											className="w-1/3 font-mono text-xs"
											onChange={(e) => {
												const newList = [...customMetaList];
												newList[index].key = e.target.value;
												setCustomMetaList(newList);
											}}
										/>
										<Input
											placeholder="Value"
											value={item.value}
											className="flex-1 text-xs"
											onChange={(e) => {
												const newList = [...customMetaList];
												newList[index].value = e.target.value;
												setCustomMetaList(newList);
											}}
										/>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
											onClick={() => {
												const newList = [...customMetaList];
												newList.splice(index, 1);
												setCustomMetaList(newList);
											}}
										>
											<Trash2 className="w-4 h-4" />
										</Button>
									</div>
								))}
								{customMetaList.length === 0 && (
									<p className="text-xs text-muted-foreground italic">
										No custom attributes defined.
									</p>
								)}
							</div>
						</div>
						<DialogFooter>
							<Button type="submit" disabled={isUpdatingMetadata}>
								{isUpdatingMetadata ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									"Save Changes"
								)}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div className="md:col-span-2 space-y-6">
					<Card className="overflow-hidden border-border bg-card">
						<div className="aspect-video bg-muted flex items-center justify-center border-b border-border">
							{getIcon(mimeType)}
						</div>
						<div className="px-4 pb-4 border-b border-border">
							<p className="text-sm text-muted-foreground mb-2">Tags</p>
							<div className="flex flex-wrap gap-2">
								{family.tags && family.tags.length > 0 ? (
									family.tags.map((tag, index) => (
										<Badge
											key={index}
											variant="secondary"
											className="text-xs font-normal"
										>
											{tag}
										</Badge>
									))
								) : (
									<span className="text-xs text-muted-foreground italic">
										No tags
									</span>
								)}
							</div>
						</div>
						{family.customMetadata &&
							Object.keys(family.customMetadata).length > 0 && (
								<div className="space-y-2 px-4 pb-4 border-b border-border">
									<p className="text-sm text-muted-foreground">
										Custom Attributes
									</p>
									<div className="bg-muted/30 rounded-md p-3 space-y-2">
										{Object.entries(family.customMetadata).map(
											([key, value]) => (
												<div
													key={key}
													className="flex justify-between items-center border-b border-border/50 last:border-0 pb-2 last:pb-0"
												>
													<span className="text-xs text-muted-foreground">
														{key}
													</span>
													<span className="text-xs font-mono font-medium">
														{value}
													</span>
												</div>
											),
										)}
									</div>
								</div>
							)}

						<CardContent className="p-6">
							<h3 className="text-lg font-semibold mb-4">Properties</h3>
							<div className="grid grid-cols-2 gap-4 text-sm">
								<div>
									<p className="text-muted-foreground">Type</p>
									<p className="font-medium">{mimeType}</p>
								</div>
								<div>
									<p className="text-muted-foreground">Versions</p>
									<p className="font-medium">{family.versions?.length}</p>
								</div>
								<div>
									<p className="text-muted-foreground">Size</p>
									<p className="font-medium">
										{(activeVersion.sizeBytes / 1024 / 1024).toFixed(2)} MB
									</p>
								</div>
								<div>
									<p className="text-muted-foreground">Created</p>
									<p className="font-medium">
										{new Date(family.createdAt).toLocaleDateString()}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="space-y-6">
					<Card className="border-border bg-card">
						<CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
							<CardTitle className="text-lg flex items-center gap-2">
								<History className="w-4 h-4" /> Versions
							</CardTitle>

							<Dialog
								open={versionModalOpen}
								onOpenChange={setVersionModalOpen}
							>
								<DialogTrigger asChild>
									<Button variant="ghost" size="icon" className="h-8 w-8">
										<Plus className="w-4 h-4" />
									</Button>
								</DialogTrigger>
								<DialogContent>
									<form onSubmit={handleNewVersionSubmit}>
										<DialogHeader>
											<DialogTitle>
												Upload v{family.nextVersionNumber}
											</DialogTitle>
											<DialogDescription>
												Adding a new version resets status to DRAFT.
											</DialogDescription>
										</DialogHeader>
										<div className="py-4">
											<Input name="file" type="file" required />
										</div>
										<DialogFooter>
											<Button type="submit" disabled={isUploadingVersion}>
												{isUploadingVersion ? (
													<Loader2 className="animate-spin" />
												) : (
													"Upload"
												)}
											</Button>
										</DialogFooter>
									</form>
								</DialogContent>
							</Dialog>
						</CardHeader>
						<CardContent className="p-0 max-h-[400px] overflow-y-auto">
							{family.versions
								?.slice()
								.reverse()
								.map((v) => (
									<div
										key={v._id}
										className={`p-4 border-b last:border-0 ${family.activeVersionId === v._id ? "bg-primary/5" : ""}`}
									>
										<div className="flex justify-between items-center">
											<span className="text-sm font-bold">
												v{v.versionNumber}
											</span>
											{family.activeVersionId === v._id && (
												<Badge className="text-[10px]">Active</Badge>
											)}
										</div>
										<p className="text-[10px] text-muted-foreground mt-1 truncate">
											{v.originalFilename}
										</p>
									</div>
								))}
						</CardContent>
					</Card>

					<Card className="border-border bg-card">
						<CardContent className="p-4 flex items-start gap-3">
							<ShieldCheck className="w-5 h-5 text-blue-500" />
							<div>
								<h4 className="text-xs font-bold">DRM Protected</h4>
								<p className="text-[10px] text-muted-foreground">
									Secure expiring download link.
								</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
