"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Search, Bell } from "lucide-react";

export function Header() {
	const [query, setQuery] = useState("");
	const router = useRouter();

	const handleSearch = (e) => {
		e.preventDefault();
		if (query.trim()) {
			router.push(`/assets?q=${encodeURIComponent(query.trim())}`);
		}
	};

	return (
		<header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-8 flex items-center justify-between sticky top-0 z-10">
			<div className="flex items-center flex-1 max-w-md">
				<form onSubmit={handleSearch} className="relative w-full">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
					<input
						type="text"
						placeholder="Search assets, versions, tags..."
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						className="w-full bg-muted border border-border rounded-full py-1.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
					/>
				</form>
			</div>

			<div className="flex items-center gap-4">
				<button className="p-2 text-muted-foreground hover:text-foreground transition-colors relative">
					<Bell className="w-5 h-5" />
					<span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-background"></span>
				</button>
				<div className="h-6 w-[1px] bg-border mx-2"></div>
				<UserButton afterSignOutUrl="/sign-in" />
			</div>
		</header>
	);
}
