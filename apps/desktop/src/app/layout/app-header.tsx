import { ModeToggle } from "@/components/mode-toggle";
import { NetworkStatusButton } from "@/app/layout/network-status-button";
import { UserMenu } from "@/app/layout/user-menu";
import { usePageMeta } from "@/app/layout/use-page-meta";

export function AppHeader() {
	const { title, description } = usePageMeta();

	return (
		<header className="flex h-12 shrink-0 items-center justify-between border-[#1e2230] border-b bg-[#12161f] px-4">
			<div className="min-w-0">
				<h1 className="truncate font-medium text-[#eef1f6] text-sm">{title}</h1>
				{description ? (
					<p className="truncate text-[#8b93a1] text-[11px]">{description}</p>
				) : null}
			</div>

			<div className="flex items-center gap-1">
				<NetworkStatusButton />
				<div className="mx-1 hidden h-5 w-px bg-[#252a36] sm:block" />
				<ModeToggle />
				<UserMenu />
			</div>
		</header>
	);
}
