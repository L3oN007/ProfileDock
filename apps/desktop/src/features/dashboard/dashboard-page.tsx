import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ProfileDock/ui/components/card";
import { Skeleton } from "@ProfileDock/ui/components/skeleton";

import { PageShell, panelClassName } from "@/app/layout/page-shell";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";
import { countryFlag, formatNetworkLocation } from "@/lib/network/ip-api";
import { useBrowserStatus, useHealthCheck } from "@/lib/query/hooks";
import { useNetworkInfo } from "@/lib/query/network";
import { isDesktopRuntime } from "@/lib/tauri/runtime";
import type { HealthStatus } from "@/types/app";

function StatusDot({ status }: { status: HealthStatus | undefined }) {
	const color =
		status === "ok" || status === "detected"
			? "bg-emerald-500"
			: status === "notdetected"
				? "bg-amber-500"
				: status === "unavailable"
					? "bg-muted-foreground"
					: "bg-red-500";

	return <span className={`inline-block size-2.5 rounded-full ${color}`} />;
}

function statusLabel(status: HealthStatus | undefined) {
	switch (status) {
		case "ok":
			return "Ready";
		case "detected":
			return "Detected";
		case "notdetected":
			return "Not detected";
		case "unavailable":
			return "Desktop only";
		case "error":
			return "Error";
		default:
			return "Unknown";
	}
}

export function DashboardPage() {
	const desktop = isDesktopRuntime();
	const healthQuery = useHealthCheck();
	const browserQuery = useBrowserStatus();
	const networkQuery = useNetworkInfo();

	return (
		<PageShell>
			<DesktopOnlyBanner />

			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
				<StatusCard
					title="Database"
					loading={desktop && healthQuery.isLoading}
					status={desktop ? healthQuery.data?.database : "unavailable"}
				/>
				<StatusCard
					title="Storage"
					loading={desktop && healthQuery.isLoading}
					status={desktop ? healthQuery.data?.filesystem : "unavailable"}
				/>
				<StatusCard
					title="CloakBrowser"
					loading={desktop && browserQuery.isLoading}
					status={
						desktop
							? browserQuery.data?.status === "detected"
								? "detected"
								: "notdetected"
							: "unavailable"
					}
					detail={
						desktop ? (browserQuery.data?.version ?? undefined) : undefined
					}
				/>
				<StatusCard
					title="Public IP"
					loading={networkQuery.isLoading}
					status={networkQuery.isSuccess ? "ok" : "error"}
					detail={
						networkQuery.data
							? `${countryFlag(networkQuery.data.countryCode)} ${networkQuery.data.ip}`
							: undefined
					}
				/>
			</div>

			{networkQuery.data ? (
				<Card className={panelClassName}>
					<CardHeader className="pb-2">
						<CardTitle className="text-base">Network location</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-2 text-sm sm:grid-cols-2">
						<InfoRow label="IP" value={networkQuery.data.ip} />
						<InfoRow
							label="Area"
							value={formatNetworkLocation(networkQuery.data)}
						/>
						<InfoRow label="ISP" value={networkQuery.data.isp ?? "—"} />
						<InfoRow
							label="Country"
							value={`${countryFlag(networkQuery.data.countryCode)} ${networkQuery.data.country}`}
						/>
					</CardContent>
				</Card>
			) : null}
		</PageShell>
	);
}

function StatusCard({
	title,
	status,
	loading,
	detail,
}: {
	title: string;
	status: HealthStatus | undefined;
	loading: boolean;
	detail?: string;
}) {
	return (
		<Card className={panelClassName}>
			<CardHeader className="pb-2">
				<CardTitle className="font-medium text-base">{title}</CardTitle>
			</CardHeader>
			<CardContent className="flex items-center gap-2 text-sm">
				{loading ? (
					<Skeleton className="h-4 w-24" />
				) : (
					<>
						<StatusDot status={status} />
						<span>{statusLabel(status)}</span>
						{detail ? (
							<span className="truncate text-[#8b93a1]">({detail})</span>
						) : null}
					</>
				)}
			</CardContent>
		</Card>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between gap-3 border-[#252a36] border-b py-2 last:border-0">
			<span className="text-[#8b93a1]">{label}</span>
			<span className="text-right text-[#dfe3ea]">{value}</span>
		</div>
	);
}
