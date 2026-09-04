import { Button } from "@ProfileDock/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ProfileDock/ui/components/card";
import { Skeleton } from "@ProfileDock/ui/components/skeleton";

import { panelClassName } from "@/app/layout/page-shell";
import { useClearProfileCache } from "@/features/profiles/api/mutations";
import { useProfileStorage } from "@/features/profiles/api/queries";
import { formatBytes } from "@/features/shared/format-bytes";

interface ProfileStorageCardProps {
	profileId: string;
	isRunning: boolean;
}

export function ProfileStorageCard({ profileId, isRunning }: ProfileStorageCardProps) {
	const storageQuery = useProfileStorage(profileId);
	const clearCache = useClearProfileCache(profileId);
	const storage = storageQuery.data;

	return (
		<Card className={panelClassName}>
			<CardHeader>
				<CardTitle>Storage</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{storageQuery.isLoading ? (
					<Skeleton className="h-24 w-full" />
				) : (
					<div className="space-y-2 text-sm">
						<StorageRow
							label="Browser data"
							value={formatBytes(storage?.browser_data_bytes ?? 0)}
						/>
						<StorageRow
							label="Cache"
							value={formatBytes(storage?.cache_bytes ?? 0)}
						/>
						<StorageRow
							label="Downloads"
							value={formatBytes(storage?.downloads_bytes ?? 0)}
						/>
						<StorageRow
							label="Total"
							value={formatBytes(storage?.total_bytes ?? 0)}
							emphasized
						/>
					</div>
				)}

				{isRunning ? (
					<p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-200 text-sm">
						Stop the browser before clearing cache.
					</p>
				) : null}

				<Button
					variant="outline"
					className="border-[#252a36]"
					disabled={isRunning || clearCache.isPending || storageQuery.isLoading}
					onClick={() => clearCache.mutate()}
				>
					Clear cache
				</Button>
				<p className="text-[#8b93a1] text-xs">
					Clears only the profile cache folder. Cookies, local storage, and browser
					data are preserved.
				</p>
			</CardContent>
		</Card>
	);
}

function StorageRow({
	label,
	value,
	emphasized,
}: {
	label: string;
	value: string;
	emphasized?: boolean;
}) {
	return (
		<div className="flex justify-between gap-4 border-[#252a36] border-b py-2 last:border-0">
			<span className="text-[#8b93a1]">{label}</span>
			<span className={emphasized ? "font-medium text-[#eef1f6]" : "text-[#dfe3ea]"}>
				{value}
			</span>
		</div>
	);
}
