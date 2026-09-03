import { Button } from "@ProfileDock/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ProfileDock/ui/components/card";
import { Link } from "@tanstack/react-router";

import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";
import { useBrowserStatus } from "@/lib/query/hooks";
import { isDesktopRuntime } from "@/lib/tauri/runtime";

export function BrowsersPage() {
	const desktop = isDesktopRuntime();
	const browserQuery = useBrowserStatus();
	const status = browserQuery.data?.status;

	const statusColor =
		status === "detected"
			? "text-emerald-500"
			: status === "invalid"
				? "text-red-500"
				: "text-amber-500";

	return (
		<div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
			<div>
				<h1 className="font-semibold text-2xl">Browsers</h1>
				<p className="text-muted-foreground">Installed browser providers</p>
			</div>

			<DesktopOnlyBanner />

			<Card>
				<CardHeader>
					<CardTitle>{browserQuery.data?.provider ?? "CloakBrowser"}</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3 text-sm">
					<div className="grid gap-1">
						<span className="text-muted-foreground">Status</span>
						<span className={statusColor}>
							{!desktop
								? "● Desktop only"
								: status === "detected"
									? "● Detected"
									: status === "invalid"
										? "● Invalid"
										: "● Not detected"}
						</span>
					</div>
					<div className="grid gap-1">
						<span className="text-muted-foreground">Executable</span>
						<span className="break-all font-mono text-xs">
							{browserQuery.data?.executable ?? "Not configured"}
						</span>
					</div>
					<div className="grid gap-1">
						<span className="text-muted-foreground">Version</span>
						<span>{browserQuery.data?.version ?? "—"}</span>
					</div>
					<Button variant="outline" className="mt-2" render={<Link to="/settings" />}>
						Change executable
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
