import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@ProfileDock/ui/components/avatar";
import { Badge } from "@ProfileDock/ui/components/badge";
import { Link } from "@tanstack/react-router";
import {
	Activity,
	FolderTree,
	LayoutDashboard,
	Puzzle,
	Plus,
	Settings,
	Shield,
	Tag,
	Trash2,
	Users,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { AppHeader } from "@/app/layout/app-header";
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
		<div className="flex h-svh bg-[#0f1117] text-foreground">
			<aside className="flex w-[210px] shrink-0 flex-col border-[#1e2230] border-r bg-[#141820]">
				<div className="border-[#1e2230] border-b px-4 py-3">
					<div className="flex items-center gap-2">
						<div className="flex size-7 items-center justify-center rounded-md bg-sky-600 font-bold text-white text-xs">
							PD
						</div>
						<div>
							<p className="font-semibold text-[#eef1f6] text-sm">ProfileDock</p>
							<p className="text-[#6f7888] text-[10px]">Profile workspace</p>
						</div>
					</div>
				</div>

				<div className="p-3">
					<Link
						to="/profiles/new"
						className="flex w-full items-center justify-center gap-2 rounded-md bg-sky-600 px-3 py-2 font-medium text-sm text-white transition-colors hover:bg-sky-500"
					>
						<Plus className="size-4" />
						New Profile
					</Link>
				</div>

				<nav className="flex flex-1 flex-col gap-4 px-2">
					<div className="space-y-0.5">
						{primaryNav.map(({ to, label, icon: Icon }) => (
							<NavLink key={to} to={to} label={label} icon={Icon} />
						))}
					</div>

					<div>
						<p className="px-3 py-1 text-[#6f7888] text-[10px] uppercase tracking-wide">
							Organization
						</p>
						<div className="space-y-0.5">
							{organizationNav.map(({ to, label, icon: Icon }) => (
								<NavLink key={to} to={to} label={label} icon={Icon} />
							))}
						</div>
					</div>

					<div>
						<p className="px-3 py-1 text-[#6f7888] text-[10px] uppercase tracking-wide">
							System
						</p>
						<div className="space-y-0.5">
							<NavLink to="/" label="Dashboard" icon={LayoutDashboard} />
							{systemNav.map(({ to, label, icon: Icon }) => (
								<NavLink key={to} to={to} label={label} icon={Icon} />
							))}
						</div>
					</div>
				</nav>

				{user ? (
					<div className="border-[#1e2230] border-t p-3">
						<div className="flex items-center gap-2 rounded-md bg-[#1a1f2b] px-2.5 py-2">
							<Avatar size="sm" className="size-8">
								{user.avatarUrl ? (
									<AvatarImage src={user.avatarUrl} alt={user.name} />
								) : null}
								<AvatarFallback className="bg-sky-600/20 text-sky-300 text-xs">
									{getUserInitials(user.name) || "G"}
								</AvatarFallback>
							</Avatar>
							<div className="min-w-0 flex-1">
								<p className="truncate font-medium text-[#dfe3ea] text-xs">
									{user.name}
								</p>
								<Badge
									variant="secondary"
									className="mt-1 h-4 px-1.5 text-[10px]"
								>
									{user.isAuthenticated ? user.plan : "Guest"}
								</Badge>
							</div>
						</div>
					</div>
				) : null}
			</aside>

			<div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0f1117]">
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
			className="flex items-center gap-2.5 rounded-md px-3 py-2 text-[#9aa3b2] text-sm transition-colors hover:bg-[#1e2230] hover:text-white [&.active]:bg-[#1e2230] [&.active]:text-white"
		>
			<Icon className="size-4" />
			{label}
		</Link>
	);
}
