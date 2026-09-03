import { Button } from "@ProfileDock/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@ProfileDock/ui/components/card";
import { Input } from "@ProfileDock/ui/components/input";
import { Label } from "@ProfileDock/ui/components/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
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
			? "text-emerald-500"
			: status === "invalid"
				? "text-red-500"
				: "text-amber-500";

	return (
		<div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
			<div>
				<h1 className="font-semibold text-2xl">Settings</h1>
				<p className="text-muted-foreground">Application configuration</p>
			</div>

			<DesktopOnlyBanner />

			<Card>
				<CardHeader>
					<CardTitle>Browser</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-1 text-sm">
						<span className="text-muted-foreground">Provider</span>
						<span>{browserQuery.data?.provider ?? "CloakBrowser"}</span>
					</div>

					<div className="grid gap-1 text-sm">
						<span className="text-muted-foreground">Executable</span>
						<span className="break-all font-mono text-xs">
							{browserQuery.data?.executable ?? "Not configured"}
						</span>
					</div>

					<div className="grid gap-1 text-sm">
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

					<div className="grid gap-1 text-sm">
						<span className="text-muted-foreground">Version</span>
						<span>{browserQuery.data?.version ?? "—"}</span>
					</div>

					<div className="space-y-2 pt-2">
						<Label htmlFor="browser-executable">Change executable</Label>
						<Input
							id="browser-executable"
							placeholder="/path/to/cloak-browser"
							value={executablePath}
							onChange={(event) => setExecutablePath(event.target.value)}
						/>
						<Button
							disabled={!desktop || !executablePath || mutation.isPending}
							onClick={() => mutation.mutate(executablePath)}
						>
							Save executable
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
