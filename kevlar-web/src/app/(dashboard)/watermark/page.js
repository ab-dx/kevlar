"use client";

import { useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import {
	Shield,
	Upload,
	Loader2,
	AlertCircle,
	CheckCircle2,
	X,
	FileImage,
	FileText,
	File,
	UploadCloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function WatermarkPage() {
	const { getToken } = useAuth();
	const [isLoading, setIsLoading] = useState(false);
	const [uploadFile, setUploadFile] = useState(null);
	const [uploadPreview, setUploadPreview] = useState(null);
	const [result, setResult] = useState(null);
	const fileInputRef = useRef(null);

	const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

	function handleFileChange(e) {
		const file = e.target.files?.[0];
		if (!file) return;

		if (file.size > 50 * 1024 * 1024) {
			setResult({ found: false, message: 'File size exceeds 50MB limit' });
			return;
		}

		setUploadFile(file);
		setResult(null);

		if (file.type.startsWith('image/')) {
			const reader = new FileReader();
			reader.onload = (ev) => setUploadPreview(ev.target.result);
			reader.readAsDataURL(file);
		} else {
			setUploadPreview(null);
		}
	}

	async function verifyWatermark() {
		if (!uploadFile) return;
		setIsLoading(true);
		setResult(null);

		try {
			const formData = new FormData();
			formData.append('file', uploadFile);

			const token = await getToken();
			const res = await fetch(`${apiBase}/assets/watermark/verify`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
				body: formData,
			});

			const data = await res.json();
			setResult(data);
		} catch (err) {
			setResult({ found: false, message: err.message });
		} finally {
			setIsLoading(false);
		}
	}

	function clearUpload() {
		setUploadFile(null);
		setUploadPreview(null);
		setResult(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	}

	function formatDate(timestamp) {
		if (!timestamp) return 'N/A';
		return new Date(timestamp).toLocaleString();
	}

	function getFileIcon(mimeType) {
		if (!mimeType) return <File className="w-12 h-12 text-muted-foreground" />;
		if (mimeType.startsWith('image/')) return <FileImage className="w-12 h-12 text-blue-500" />;
		if (mimeType === 'application/pdf') return <FileText className="w-12 h-12 text-red-500" />;
		return <File className="w-12 h-12 text-muted-foreground" />;
	}

	return (
		<div className="p-6 max-w-4xl mx-auto">
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight">Watermark Verification</h1>
				<p className="text-muted-foreground mt-2">
					Upload external files to verify if they contain watermarks from this system
				</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Upload className="w-5 h-5" />
						Upload File to Verify
					</CardTitle>
					<CardDescription>
						Drag and drop or click to upload an image or PDF (max 50MB)
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{!uploadFile ? (
						<div className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer">
							<input
								type="file"
								accept="image/*,application/pdf"
								onChange={handleFileChange}
								className="hidden"
								ref={fileInputRef}
								id="watermark-upload"
							/>
							<label htmlFor="watermark-upload" className="cursor-pointer">
								<div className="flex flex-col items-center gap-3">
									<UploadCloud className="w-12 h-12 text-muted-foreground" />
									<div>
										<p className="text-sm font-medium">
											Click to upload or drag and drop
										</p>
										<p className="text-xs text-muted-foreground mt-1">
											PNG, JPG, WEBP, PDF (max 50MB)
										</p>
									</div>
								</div>
							</label>
						</div>
					) : (
						<div className="space-y-4">
							<div className="relative flex items-center gap-4 p-4 border rounded-lg">
								<Button
									variant="ghost"
									size="icon"
									className="absolute top-2 right-2"
									onClick={clearUpload}
								>
									<X className="w-4 h-4" />
								</Button>
								{uploadPreview ? (
									<img
										src={uploadPreview}
										alt="Preview"
										className="w-20 h-20 object-cover rounded"
									/>
								) : (
									<div className="w-20 h-20 flex items-center justify-center bg-muted rounded">
										{getFileIcon(uploadFile.type)}
									</div>
								)}
								<div className="flex-1 min-w-0">
									<p className="font-medium truncate">{uploadFile.name}</p>
									<p className="text-sm text-muted-foreground">
										{(uploadFile.size / 1024 / 1024).toFixed(2)} MB
									</p>
								</div>
							</div>
							<Button
								onClick={verifyWatermark}
								disabled={isLoading}
								className="w-full"
							>
								{isLoading ? (
									<Loader2 className="w-4 h-4 animate-spin mr-2" />
								) : (
									<Shield className="w-4 h-4 mr-2" />
								)}
								{isLoading ? 'Verifying...' : 'Verify Watermark'}
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			{result && (
				<Card className="mt-6">
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							{result.found ? (
								<>
									<CheckCircle2 className="w-5 h-5 text-green-500" />
									<span className="text-green-500">Watermark Found</span>
								</>
							) : (
								<>
									<AlertCircle className="w-5 h-5 text-yellow-500" />
									<span className="text-yellow-500">No Watermark Found</span>
								</>
							)}
						</CardTitle>
					</CardHeader>
					<CardContent>
						{result.found && result.data ? (
							<div className="space-y-4">
								<div className="p-3 bg-green-50 border border-green-200 rounded-lg">
									<p className="text-sm text-green-800 font-medium">
										This file originated from your system
									</p>
								</div>
								<div className="grid gap-3 sm:grid-cols-2">
									<div>
										<p className="text-sm text-muted-foreground">Tenant ID</p>
										<p className="font-mono text-sm">{result.data.tenantId}</p>
									</div>
									<div>
										<p className="text-sm text-muted-foreground">Uploaded By</p>
										<p className="font-mono text-sm">{result.data.actorId}</p>
									</div>
									<div>
										<p className="text-sm text-muted-foreground">Version ID</p>
										<p className="font-mono text-sm">{result.data.versionId}</p>
									</div>
									<div>
										<p className="text-sm text-muted-foreground">Family ID</p>
										<p className="font-mono text-sm">{result.data.familyId}</p>
									</div>
									<div className="sm:col-span-2">
										<p className="text-sm text-muted-foreground">Upload Timestamp</p>
										<p className="text-sm">{formatDate(result.data.timestamp)}</p>
									</div>
									<div className="sm:col-span-2">
										<p className="text-sm text-muted-foreground">Verification Time</p>
										<p className="text-sm">{formatDate(result.data.extractedAt)}</p>
									</div>
								</div>
							</div>
						) : (
							<div className="space-y-2">
								<div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
									<p className="text-sm text-yellow-800 font-medium">
										No watermark detected
									</p>
								</div>
								<p className="text-muted-foreground text-sm">
									{result.message || 'This file does not contain a watermark from your system. It may be a clean file or from another source.'}
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}