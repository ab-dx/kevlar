"use client";

import {
	SignInButton,
	Show,
	UserButton,
	OrganizationSwitcher,
	useAuth,
} from "@clerk/nextjs";
import { useState } from "react";

export default function Home() {
	const { getToken, orgId, userId } = useAuth();
	const [token, setToken] = useState("");

	const fetchToken = async () => {
		try {
			const rawToken = await getToken({ skipCache: true });
			if (rawToken) setToken(rawToken);
		} catch (err) {
			console.error("Failed to fetch token", err);
		}
	};

	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-24 space-y-8">
			<Show when="signed-out">
				<div className="text-center">
					<h1 className="text-4xl font-bold mb-4 tracking-tight">Kevlar</h1>
					<p className="text-slate-400 mb-8">Enterprise Media DAM</p>
					<div className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-medium transition-colors">
						<SignInButton mode="modal" />
					</div>
				</div>
			</Show>

			<Show when="signed-in">
				<header className="w-full max-w-4xl flex justify-between items-center border-b border-slate-800 pb-4">
					<h1 className="text-2xl font-bold tracking-tight">
						Kevlar Command Center
					</h1>
					<div className="flex items-center gap-4">
						<OrganizationSwitcher hidePersonal={true} />
						<UserButton />
					</div>
				</header>

				<div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
					{/* Identity Card */}
					<div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
						<h2 className="text-lg font-semibold mb-4 text-slate-200">
							Current Context
						</h2>
						<div className="space-y-2 text-sm">
							<p>
								<span className="text-slate-500 w-24 inline-block">
									User ID:
								</span>{" "}
								<span className="font-mono text-xs">{userId}</span>
							</p>
							<p>
								<span className="text-slate-500 w-24 inline-block">
									Tenant ID:
								</span>
								{orgId ? (
									<span className="font-mono text-xs text-green-400">
										{orgId}
									</span>
								) : (
									<span className="text-red-400">No Organization Selected</span>
								)}
							</p>
						</div>
						{!orgId && (
							<div className="mt-4 p-3 bg-red-950/50 border border-red-900/50 rounded text-red-400 text-sm">
								You must select or create an Organization
							</div>
						)}
					</div>

					<div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
						<h2 className="text-lg font-semibold mb-4 text-slate-200">
							API Testing Tools
						</h2>
						<p className="text-sm text-slate-400 mb-4">
							Fetch your active Bearer token
						</p>
						<button
							onClick={fetchToken}
							disabled={!orgId}
							className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2 rounded border border-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Generate Bearer Token
						</button>

						{token && (
							<div className="mt-4">
								<p className="text-xs text-slate-500 mb-2">
									Your JWT (expires shortly):
								</p>
								<textarea
									readOnly
									value={token}
									className="w-full h-24 bg-slate-950 text-slate-300 text-xs font-mono p-2 rounded border border-slate-800 outline-none resize-none"
									onClick={(e) => e.target.select()}
								/>
							</div>
						)}
					</div>
				</div>
			</Show>
		</main>
	);
}
