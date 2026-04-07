import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export default function DashboardLayout({ children }) {
	return (
		<div className="flex h-screen bg-background text-foreground overflow-hidden">
			<Sidebar />
			<div className="flex flex-col flex-1 min-w-0">
				<Header />
				<main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
					<div className="max-w-[1600px] mx-auto">{children}</div>
				</main>
			</div>
		</div>
	);
}
