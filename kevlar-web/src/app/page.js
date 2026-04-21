"use client";
import { HeroSection } from "@/components/ui/hero-section-shadcnui";
import { BackgroundPaths } from "@/components/ui/paths";

export default function Demo() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-8">
			<HeroSection />
			<BackgroundPaths />
		</div>
	);
}
