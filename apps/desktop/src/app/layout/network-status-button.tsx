import { Button } from "@ProfileDock/ui/components/button";
import {
	Popover,
	PopoverContent,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@ProfileDock/ui/components/popover";
import { Skeleton } from "@ProfileDock/ui/components/skeleton";
import { CheckCircle2, RefreshCw, Wifi, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

import { countryFlag, formatNetworkLocation } from "@/lib/network/ip-api";
import { useNetworkInfo } from "@/lib/query/network";

export function NetworkStatusButton() {
	const networkQuery = useNetworkInfo();
	const info = networkQuery.data;
	const isOnline = networkQuery.isSuccess && Boolean(info);
	const isLoading = networkQuery.isLoading;

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						variant="ghost"
						size="sm"
						className="h-8 gap-2 rounded-md px-2.5 text-foreground transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted hover:text-foreground data-[popup-open]:bg-muted"
					/>
				}
			>
				{isLoading ? (
					<Skeleton className="size-4 rounded-full" />
				) : isOnline ? (
					<span className="relative">
						<Wifi className="size-4 text-emerald-500" />
						<CheckCircle2 className="absolute -right-1 -bottom-1 size-2.5 fill-background text-emerald-500" />
					</span>
				) : (
					<WifiOff className="size-4 text-amber-500" />
				)}
				<span className="hidden max-w-[140px] truncate text-foreground text-xs sm:inline">
					{isLoading ? "Checking IP..." : (info?.ip ?? "Offline")}
				</span>
			</PopoverTrigger>

			<PopoverContent
				align="end"
				className="w-80 border-border bg-card p-0"
			>
				<PopoverHeader className="border-border border-b px-4 py-3">
					<div className="flex items-center justify-between gap-2">
						<PopoverTitle className="text-sm">Current Network</PopoverTitle>
						<Button
							variant="ghost"
							size="icon-sm"
							disabled={networkQuery.isFetching}
							onClick={() => networkQuery.refetch()}
						>
							<RefreshCw
								className={`size-3.5 ${networkQuery.isFetching ? "animate-spin" : ""}`}
							/>
						</Button>
					</div>
				</PopoverHeader>

				<div className="space-y-3 px-4 py-3 text-sm">
					{networkQuery.isError ? (
						<p className="text-amber-400 text-xs">
							Unable to detect public IP. Check your internet connection.
						</p>
					) : isLoading ? (
						<div className="space-y-2">
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-2/3" />
						</div>
					) : info ? (
						<>
							<NetworkRow label="IP" value={info.ip} mono />
							<NetworkRow
								label="Area"
								value={
									<span className="inline-flex items-center gap-1.5">
										<span>{countryFlag(info.countryCode)}</span>
										<span>{formatNetworkLocation(info)}</span>
									</span>
								}
							/>
							{info.isp ? <NetworkRow label="ISP" value={info.isp} /> : null}
							{info.latitude != null && info.longitude != null ? (
								<NetworkRow
									label="Coordinates"
									value={`${info.latitude.toFixed(2)}, ${info.longitude.toFixed(2)}`}
									mono
								/>
							) : null}
						</>
					) : null}
				</div>
			</PopoverContent>
		</Popover>
	);
}

function NetworkRow({
	label,
	value,
	mono,
}: {
	label: string;
	value: ReactNode;
	mono?: boolean;
}) {
	return (
		<div className="grid grid-cols-[72px_1fr] gap-2 text-xs">
			<span className="text-muted-foreground">{label}</span>
			<span
				className={
					mono ? "truncate font-mono text-foreground" : "text-foreground"
				}
			>
				{value}
			</span>
		</div>
	);
}
