import {
	LayoutDashboard,
	FolderKanban,
	ShieldCheck,
	History,
	Settings,
} from "lucide-react";
import Link from "next/link";
import { OrganizationSwitcher } from "@clerk/nextjs";

const navigation = [
	{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
	{ name: "Assets", href: "/assets", icon: FolderKanban },
	{ name: "Deliveries", href: "/deliveries", icon: ShieldCheck },
	{ name: "Audit Logs", href: "/audit", icon: History },
];

export function Sidebar() {
	return (
		<aside className="w-64 border-r border-border flex flex-col bg-card">
			<div className="p-6 flex items-center gap-3">
				<div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-primary-foreground">
					K
				</div>
				<span className="text-xl font-bold tracking-tight font-sans">
					Kevlar
				</span>
			</div>

			<div className="px-4 mb-6">
				<OrganizationSwitcher
					appearance={{
						elements: {
							rootBox: "w-full bg-muted rounded-md p-1",
							organizationSwitcherTrigger:
								"text-foreground w-full justify-between",
						},
					}}
				/>
			</div>

			<nav className="flex-1 px-4 space-y-1">
				{navigation.map((item) => (
					<Link
						key={item.name}
						href={item.href}
						className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-all group"
					>
						<item.icon className="w-4 h-4 group-hover:text-primary transition-colors" />
						{item.name}
					</Link>
				))}
			</nav>

			<div className="p-4 border-t border-border">
				<button className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground w-full hover:text-foreground transition-colors">
					<Settings className="w-4 h-4" />
					Settings
				</button>
			</div>
		</aside>
	);
}
