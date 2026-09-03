import { Button } from "@ProfileDock/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ProfileDock/ui/components/card";
import { Input } from "@ProfileDock/ui/components/input";
import { Label } from "@ProfileDock/ui/components/label";
import type { ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { PageShell, panelClassName } from "@/app/layout/page-shell";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";
import { useBrowserStatus } from "@/lib/query/hooks";
import { setBrowserExecutable } from "@/lib/tauri/browser";
import { isDesktopRuntime } from "@/lib/tauri/runtime";
import type { AppError } from "@/types/app";

export function BrowserSettingsPage() {
	const desktop = isDesktopRuntime();
	const browserQuery = useBrowserStatus();
	const queryClient = useQueryClient();
	const [executablePath, setExecutablePath] = useState("");

	const mutation = useMutation({
		mutationFn: setBrowserExecutable,
		onSuccess: () => {
			toast.success("Browser executable updated");
			queryClient.invalidateQueries({ queryKey: ["browser-status"] });
			queryClient.invalidateQueries({ queryKey: ["health-check"] });
		},
		onError: (error: AppError) => {
			toast.error(error.message);
		},
	});

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
					<CardTitle>Browser</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<SettingRow label="Provider" value={browserQuery.data?.provider ?? "CloakBrowser"} />
					<SettingRow
						label="Executable"
						value={
							<span className="break-all font-mono text-xs">
								{browserQuery.data?.executable ?? "Not configured"}
							</span>
						}
					/>
					<SettingRow
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
					<SettingRow label="Version" value={browserQuery.data?.version ?? "—"} />

					<div className="space-y-2 border-[#252a36] border-t pt-4">
						<Label htmlFor="browser-executable">Change executable</Label>
						<Input
							id="browser-executable"
							className="border-[#252a36] bg-[#0f1117]"
							placeholder="/path/to/cloak-browser"
							value={executablePath}
							onChange={(event) => setExecutablePath(event.target.value)}
						/>
						<Button
							className="bg-sky-600 hover:bg-sky-500"
							disabled={!desktop || !executablePath || mutation.isPending}
							onClick={() => mutation.mutate(executablePath)}
						>
							Save executable
						</Button>
					</div>
				</CardContent>
			</Card>
		</PageShell>
	);
}

function SettingRow({
	label,
	value,
}: {
	label: string;
	value: ReactNode;
}) {
	return (
		<div className="grid gap-1 border-[#252a36] border-b py-2 text-sm last:border-0">
			<span className="text-[#8b93a1]">{label}</span>
			<div className="text-[#dfe3ea]">{value}</div>
		</div>
	);
}
