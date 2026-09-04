import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@ProfileDock/ui/components/avatar";
import { Link } from "@tanstack/react-router";
import {
	Activity,
	ChevronDown,
	FolderTree,
	LayoutDashboard,
	Plus,
	Puzzle,
	Settings,
	Shield,
	Tag,
	Trash2,
	Users,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";

import { notion } from "@/app/design/system";
import { AppHeader } from "@/app/layout/app-header";
import { RouterButton } from "@/components/router-button";
import { getUserInitials, useAppUser } from "@/features/auth/session";

const primaryNav = [
	{ to: "/profiles", label: "Profiles", icon: Users },
] as const;

const organizationNav = [
	{ to: "/groups", label: "Groups", icon: FolderTree },
	{ to: "/tags", label: "Tags", icon: Tag },
	{ to: "/proxies", label: "Proxies", icon: Shield },
	{ to: "/extensions", label: "Extensions", icon: Puzzle },
	{ to: "/trash", label: "Trash", icon: Trash2 },
] as const;

const systemNav = [
	{ to: "/activity", label: "Activity", icon: Activity },
	{ to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
	const userQuery = useAppUser();
	const user = userQuery.data;

	return (
		<div className={notion.shell}>
			<aside className={notion.sidebar}>
				<div className="px-3 pt-3 pb-2">
					<button
						type="button"
						className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-sidebar-accent"
					>
						<div className="flex size-7 items-center justify-center rounded-md bg-primary font-semibold text-[11px] text-primary-foreground">
							PD
						</div>
						<div className="min-w-0 flex-1">
							<p className="truncate font-medium text-[13px] text-foreground">
								ProfileDock
							</p>
							<p className="truncate text-[11px] text-muted-foreground">
								Workspace
							</p>
						</div>
						<ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
					</button>
				</div>

				<div className="px-3 pb-2">
					<RouterButton
						to="/profiles/new"
						size="sm"
						className="h-8 w-full justify-start gap-2 px-2.5 text-[13px]"
					>
						<Plus className="size-3.5" />
						New profile
					</RouterButton>
				</div>

				<nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 pb-4">
					<div className="space-y-0.5">
						{primaryNav.map(({ to, label, icon: Icon }) => (
							<NavLink key={to} to={to} label={label} icon={Icon} />
						))}
					</div>

					<div>
						<p className={notion.sidebarSection}>Organization</p>
						<div className="space-y-0.5">
							{organizationNav.map(({ to, label, icon: Icon }) => (
								<NavLink key={to} to={to} label={label} icon={Icon} />
							))}
						</div>
					</div>

					<div>
						<p className={notion.sidebarSection}>System</p>
						<div className="space-y-0.5">
							<NavLink to="/" label="Dashboard" icon={LayoutDashboard} />
							{systemNav.map(({ to, label, icon: Icon }) => (
								<NavLink key={to} to={to} label={label} icon={Icon} />
							))}
						</div>
					</div>
				</nav>

				{user ? (
					<div className="border-sidebar-border border-t p-3">
						<div className="flex items-center gap-2 rounded-md px-2 py-2 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-sidebar-accent">
							<Avatar size="sm" className="size-7">
								{user.avatarUrl ? (
									<AvatarImage src={user.avatarUrl} alt={user.name} />
								) : null}
								<AvatarFallback className="bg-muted text-[10px] text-foreground">
									{getUserInitials(user.name) || "G"}
								</AvatarFallback>
							</Avatar>
							<div className="min-w-0 flex-1">
								<p className="truncate font-medium text-[12px] text-foreground">
									{user.name}
								</p>
								<p className="truncate text-[11px] text-muted-foreground">
									{user.isAuthenticated ? user.plan : "Guest"}
								</p>
							</div>
						</div>
					</div>
				) : null}
			</aside>

			<div className={notion.main}>
				<AppHeader />
				<main className="flex min-h-0 flex-1 flex-col overflow-hidden">
					{children}
				</main>
			</div>
		</div>
	);
}

function NavLink({
	to,
	label,
	icon: Icon,
}: {
	to: string;
	label: string;
	icon: ComponentType<{ className?: string }>;
}) {
	return (
		<Link
			to={to}
			className={notion.navItem}
			activeProps={{
				className:
					"bg-sidebar-accent font-medium text-sidebar-accent-foreground",
			}}
		>
			<Icon className="size-4 shrink-0 opacity-80" />
			<span className="truncate">{label}</span>
		</Link>
	);
}
