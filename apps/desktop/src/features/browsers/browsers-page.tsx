import { Button } from "@ProfileDock/ui/components/button";
import { Link } from "@tanstack/react-router";

import {
	DetailRow,
	PageShell,
	PageTitle,
	SectionBlock,
} from "@/app/layout/page-shell";
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
			<PageTitle
				title="Browsers"
				description="CloakBrowser detection and runtime status."
			/>
			<DesktopOnlyBanner />

			<SectionBlock title={browserQuery.data?.provider ?? "CloakBrowser"}>
				<div>
					<DetailRow
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
					<DetailRow label="Version" value={browserQuery.data?.version ?? "—"} />
					<DetailRow
						label="Executable"
						value={
							<span className="break-all font-mono text-xs">
								{browserQuery.data?.executable ?? "—"}
							</span>
						}
					/>
				</div>
				<Button variant="outline" render={<Link to="/settings" />}>
					Open settings
				</Button>
			</SectionBlock>
		</PageShell>
	);
}
