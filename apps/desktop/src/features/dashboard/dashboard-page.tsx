import { Skeleton } from "@ProfileDock/ui/components/skeleton";
import type { ReactNode } from "react";

import {
	DetailRow,
	PageShell,
	PageTitle,
	SectionBlock,
	StatsBar,
	StatTile,
} from "@/app/layout/page-shell";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";
import { CountryFlag } from "@/components/country-flag";
import { formatNetworkLocation } from "@/lib/network/ip-api";
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
			<PageTitle
				title="Dashboard"
				description="System health and network overview for your workspace."
			/>
			<DesktopOnlyBanner />

			<StatsBar columns={4}>
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
						networkQuery.data ? (
							<span className="inline-flex items-center gap-1">
								<CountryFlag code={networkQuery.data.countryCode} />
								{networkQuery.data.ip}
							</span>
						) : undefined
					}
				/>
			</StatsBar>

			{networkQuery.data ? (
				<SectionBlock title="Network location">
					<div>
						<DetailRow label="IP" value={networkQuery.data.ip} />
						<DetailRow
							label="Area"
							value={formatNetworkLocation(networkQuery.data)}
						/>
						<DetailRow label="ISP" value={networkQuery.data.isp ?? "—"} />
						<DetailRow
							label="Country"
							value={
								<span className="inline-flex items-center gap-1.5">
									<CountryFlag code={networkQuery.data.countryCode} />
									{networkQuery.data.country}
								</span>
							}
						/>
					</div>
				</SectionBlock>
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
	detail?: ReactNode;
}) {
	return (
		<StatTile
			label={title}
			variant="segment"
			value={
				loading ? (
					<Skeleton className="h-7 w-24" />
				) : (
					<span className="flex items-center gap-2 text-base">
						<StatusDot status={status} />
						<span className="font-medium text-sm">{statusLabel(status)}</span>
						{detail ? (
							<span className="truncate font-normal text-muted-foreground text-xs">
								{detail}
							</span>
						) : null}
					</span>
				)
			}
		/>
	);
}
