import { NetworkStatusButton } from "@/app/layout/network-status-button";
import { usePageMeta } from "@/app/layout/use-page-meta";
import { UserMenu } from "@/app/layout/user-menu";
import { notion } from "@/app/design/system";
import { ModeToggle } from "@/components/mode-toggle";

export function AppHeader() {
	const { title, description } = usePageMeta();

	return (
		<header className={notion.header}>
			<div className="min-w-0">
				<p className="truncate font-medium text-foreground text-sm">{title}</p>
				{description ? (
					<p className="truncate text-muted-foreground text-xs">{description}</p>
				) : null}
			</div>

			<div className="flex items-center gap-1">
				<NetworkStatusButton />
				<div className="mx-1 hidden h-4 w-px bg-border sm:block" />
				<ModeToggle />
				<UserMenu />
			</div>
		</header>
	);
}
