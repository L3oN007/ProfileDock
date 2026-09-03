import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ProfileDock/ui/components/card";
import { Skeleton } from "@ProfileDock/ui/components/skeleton";

import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";
import { useBrowserStatus, useHealthCheck } from "@/lib/query/hooks";
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

	return (
		<div className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
			<div>
				<h1 className="font-semibold text-2xl">ProfileDock</h1>
				<p className="text-muted-foreground">
					{desktop ? "System Ready" : "Web preview"}
				</p>
			</div>

			<DesktopOnlyBanner />

			<div className="grid gap-4 md:grid-cols-3">
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
					detail={desktop ? (browserQuery.data?.version ?? undefined) : undefined}
				/>
			</div>
		</div>
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
		<Card>
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
							<span className="text-muted-foreground">({detail})</span>
						) : null}
					</>
				)}
			</CardContent>
		</Card>
	);
}
