import { Button } from "@ProfileDock/ui/components/button";
import { Skeleton } from "@ProfileDock/ui/components/skeleton";

import { DetailRow, SectionBlock } from "@/app/layout/page-shell";
import { useClearProfileCache } from "@/features/profiles/api/mutations";
import { useProfileStorage } from "@/features/profiles/api/queries";
import { formatBytes } from "@/features/shared/format-bytes";

interface ProfileStorageCardProps {
	profileId: string;
	isRunning: boolean;
}

export function ProfileStorageCard({
	profileId,
	isRunning,
}: ProfileStorageCardProps) {
	const storageQuery = useProfileStorage(profileId);
	const clearCache = useClearProfileCache(profileId);
	const storage = storageQuery.data;

	return (
		<SectionBlock title="Storage" inset>
			{storageQuery.isLoading ? (
				<Skeleton className="h-24 w-full rounded-lg" />
			) : (
				<div>
					<DetailRow
						label="Browser data"
						value={formatBytes(storage?.browser_data_bytes ?? 0)}
					/>
					<DetailRow
						label="Cache"
						value={formatBytes(storage?.cache_bytes ?? 0)}
					/>
					<DetailRow
						label="Downloads"
						value={formatBytes(storage?.downloads_bytes ?? 0)}
					/>
					<DetailRow
						label="Total"
						value={formatBytes(storage?.total_bytes ?? 0)}
					/>
				</div>
			)}

			{isRunning ? (
				<p className="rounded-lg bg-amber-500/10 px-3 py-2 text-amber-600 text-sm dark:text-amber-300">
					Stop the browser before clearing cache.
				</p>
			) : null}

			<Button
				variant="outline"
				disabled={isRunning || clearCache.isPending || storageQuery.isLoading}
				onClick={() => clearCache.mutate()}
			>
				Clear cache
			</Button>
			<p className="text-muted-foreground text-xs">
				Clears only the profile cache folder. Cookies, local storage, and
				browser data are preserved.
			</p>
		</SectionBlock>
	);
}
