import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@ProfileDock/ui/components/avatar";
import { Badge } from "@ProfileDock/ui/components/badge";
import { Button } from "@ProfileDock/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@ProfileDock/ui/components/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { LogIn, LogOut, Settings, UserRound } from "lucide-react";

import { getUserInitials, useAppUser } from "@/features/auth/session";

export function UserMenu() {
	const userQuery = useAppUser();
	const user = userQuery.data;

	if (!user) return null;

	const initials = getUserInitials(user.name);
	const planLabel =
		user.plan === "guest"
			? "Guest mode"
			: user.plan === "free"
				? "Free"
				: "Pro";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="sm"
						className="h-8 gap-2 px-1.5 hover:bg-accent"
					/>
				}
			>
				<Avatar size="sm" className="size-7">
					{user.avatarUrl ? (
						<AvatarImage src={user.avatarUrl} alt={user.name} />
					) : null}
					<AvatarFallback className="bg-muted text-[11px] text-foreground">
						{initials || "G"}
					</AvatarFallback>
				</Avatar>
				<span className="hidden max-w-[120px] truncate text-foreground text-xs md:inline">
					{user.name}
				</span>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align="end"
				className="w-56 border-border bg-card"
			>
				<DropdownMenuLabel className="font-normal">
					<div className="flex items-center gap-3 py-1">
						<Avatar size="sm">
							{user.avatarUrl ? (
								<AvatarImage src={user.avatarUrl} alt={user.name} />
							) : null}
							<AvatarFallback className="bg-muted text-foreground">
								{initials || "G"}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0 flex-1">
							<p className="truncate font-medium text-sm">{user.name}</p>
							<p className="truncate text-muted-foreground text-xs">
								{user.email ?? "Not signed in"}
							</p>
						</div>
					</div>
					<Badge variant="secondary" className="mt-2">
						{planLabel}
					</Badge>
				</DropdownMenuLabel>

				<DropdownMenuSeparator />

				{user.isAuthenticated ? (
					<>
						<DropdownMenuItem className="gap-2">
							<UserRound className="size-3.5" />
							Account
						</DropdownMenuItem>
						<DropdownMenuItem
							className="gap-2"
							render={<Link to="/settings" />}
						>
							<Settings className="size-3.5" />
							Settings
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem className="gap-2 text-destructive">
							<LogOut className="size-3.5" />
							Sign out
						</DropdownMenuItem>
					</>
				) : (
					<DropdownMenuItem className="gap-2 text-chart-1" disabled>
						<LogIn className="size-3.5" />
						Sign in (coming soon)
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
