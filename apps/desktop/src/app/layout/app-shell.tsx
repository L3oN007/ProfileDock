import { Link } from "@tanstack/react-router";
import { Globe, LayoutDashboard, Settings, Shield, Users } from "lucide-react";

import { ModeToggle } from "@/components/mode-toggle";

const navItems = [
	{ to: "/", label: "Dashboard", icon: LayoutDashboard },
	{ to: "/profiles", label: "Profiles", icon: Users },
	{ to: "/proxies", label: "Proxies", icon: Shield },
	{ to: "/browsers", label: "Browsers", icon: Globe },
	{ to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex h-svh bg-background text-foreground">
			<aside className="flex w-56 shrink-0 flex-col border-r">
				<div className="flex items-center justify-between border-b px-4 py-3">
					<span className="font-semibold tracking-tight">ProfileDock</span>
					<ModeToggle />
				</div>
				<nav className="flex flex-1 flex-col gap-1 p-3">
					{navItems.map(({ to, label, icon: Icon }) => (
						<Link
							key={to}
							to={to}
							className="flex items-center gap-2 rounded-md px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground [&.active]:bg-muted [&.active]:text-foreground"
						>
							<Icon className="size-4" />
							{label}
						</Link>
					))}
				</nav>
			</aside>
			<main className="flex-1 overflow-auto">{children}</main>
		</div>
	);
}
