import { Button } from "@ProfileDock/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ProfileDock/ui/components/card";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { PageShell, panelClassName } from "@/app/layout/page-shell";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";
import { useBrowserStatus } from "@/lib/query/hooks";
import { isDesktopRuntime } from "@/lib/tauri/runtime";

export function BrowsersPage() {
	const desktop = isDesktopRuntime();
	const browserQuery = useBrowserStatus();
	const status = browserQuery.data?.status;

	const statusColor =
		status === "detected"
			? "text-emerald-400"
			: status === "invalid"
				? "text-red-400"
				: "text-amber-400";

	return (
		<PageShell>
			<DesktopOnlyBanner />

			<Card className={panelClassName}>
				<CardHeader>
					<CardTitle>{browserQuery.data?.provider ?? "CloakBrowser"}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<Row
						label="Status"
						value={
							<span className={statusColor}>
								{!desktop
									? "Desktop only"
									: status === "detected"
										? "Detected"
										: status === "invalid"
											? "Invalid"
											: "Not detected"}
							</span>
						}
					/>
					<Row
						label="Executable"
						value={
							<span className="break-all font-mono text-xs">
								{browserQuery.data?.executable ?? "Not configured"}
							</span>
						}
					/>
					<Row label="Version" value={browserQuery.data?.version ?? "—"} />
					<Button
						variant="outline"
						className="mt-2 border-border"
						render={<Link to="/settings" />}
					>
						Change executable
					</Button>
				</CardContent>
			</Card>
		</PageShell>
	);
}

function Row({ label, value }: { label: string; value: ReactNode }) {
	return (
		<div className="grid gap-1 border-border border-b py-2 last:border-0">
			<span className="text-muted-foreground">{label}</span>
			<div className="text-foreground">{value}</div>
		</div>
	);
}
