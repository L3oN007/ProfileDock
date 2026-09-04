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
import { useState } from "react";

import { PageShell, panelClassName } from "@/app/layout/page-shell";
import {
	useAutoConfigureCloak,
	useCloakCapabilities,
	useCloakInstallation,
	useDiscoveredCloakInstallations,
	useSetCloakExecutable,
	useValidateCloakInstallation,
} from "@/features/cloak/api/queries";
import {
	useActivateCloakRuntime,
	useCloakRuntimeList,
	useCloakRuntimeStatus,
	useCloakRuntimeUpdate,
	useInstallCloakRuntime,
	useRemoveCloakRuntime,
} from "@/features/cloak/api/runtime-queries";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";
import { isDesktopRuntime } from "@/lib/tauri/runtime";

export function BrowserSettingsPage() {
	const desktop = isDesktopRuntime();
	const installationQuery = useCloakInstallation();
	const capabilitiesQuery = useCloakCapabilities();
	const discoveredQuery = useDiscoveredCloakInstallations();
	const setExecutable = useSetCloakExecutable();
	const validateInstallation = useValidateCloakInstallation();
	const autoConfigure = useAutoConfigureCloak();
	const runtimeStatusQuery = useCloakRuntimeStatus();
	const runtimeListQuery = useCloakRuntimeList();
	const runtimeUpdateQuery = useCloakRuntimeUpdate();
	const installRuntime = useInstallCloakRuntime();
	const activateRuntime = useActivateCloakRuntime();
	const removeRuntime = useRemoveCloakRuntime();
	const [executablePath, setExecutablePath] = useState("");

	const installation = installationQuery.data;
	const runtimeStatus = runtimeStatusQuery.data;
	const installProgress = installRuntime.progress;
	const statusColor = installation?.valid
		? installation.compatible
			? "text-emerald-400"
			: "text-amber-400"
		: installation?.executable
			? "text-red-400"
			: "text-amber-400";

	return (
		<PageShell>
			<DesktopOnlyBanner />

			<Card className={panelClassName}>
				<CardHeader>
					<CardTitle>Managed CloakBrowser Runtime</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<SettingRow
						label="Active version"
						value={runtimeStatus?.active_runtime?.version ?? "Not installed"}
					/>
					<SettingRow
						label="Managed runtimes"
						value={String(runtimeStatus?.managed_count ?? 0)}
					/>
					{runtimeUpdateQuery.data?.update_available ? (
						<p className="text-amber-400 text-sm">
							Update available: {runtimeUpdateQuery.data.available_version}
						</p>
					) : null}

					{installProgress &&
					installProgress.phase !== "completed" &&
					installProgress.phase !== "failed" ? (
						<div className="space-y-2 rounded-md border border-[#252a36] bg-[#0f1117] p-3 text-sm">
							<p className="font-medium text-[#dfe3ea]">
								Installing {installProgress.version ?? "CloakBrowser"}
							</p>
							<p className="text-[#8b93a1] capitalize">
								{installProgress.phase}
								{installProgress.message ? ` · ${installProgress.message}` : ""}
							</p>
							{installProgress.percent != null ? (
								<div className="h-2 overflow-hidden rounded-full bg-[#252a36]">
									<div
										className="h-full bg-sky-500 transition-all"
										style={{ width: `${installProgress.percent}%` }}
									/>
								</div>
							) : null}
						</div>
					) : null}

					<div className="flex flex-wrap gap-2">
						<Button
							className="bg-sky-600 hover:bg-sky-500"
							disabled={!desktop || installRuntime.isPending}
							onClick={() => installRuntime.mutate(undefined)}
						>
							{runtimeStatus?.installed ? "Reinstall / Update" : "Install CloakBrowser"}
						</Button>
					</div>

					{(runtimeListQuery.data ?? []).length > 0 ? (
						<div className="space-y-2 border-[#252a36] border-t pt-4">
							<p className="font-medium text-[#dfe3ea] text-sm">Installed versions</p>
							<ul className="space-y-2">
								{(runtimeListQuery.data ?? []).map((runtime) => (
									<li
										key={runtime.id}
										className="rounded-md border border-[#252a36] p-3 text-sm"
									>
										<div className="flex items-start justify-between gap-3">
											<div>
												<p className="text-[#dfe3ea]">
													{runtime.version}
													{runtime.active ? (
														<span className="ml-2 text-emerald-400 text-xs">
															Active
														</span>
													) : null}
												</p>
												<p className="font-mono text-[#8b93a1] text-xs">
													{runtime.root_dir}
												</p>
											</div>
											<div className="flex shrink-0 gap-2">
												{!runtime.active ? (
													<Button
														size="sm"
														variant="outline"
														className="border-[#252a36]"
														disabled={
															!desktop ||
															activateRuntime.isPending ||
															installRuntime.isPending
														}
														onClick={() => activateRuntime.mutate(runtime.id)}
													>
														Activate
													</Button>
												) : null}
												{!runtime.active ? (
													<Button
														size="sm"
														variant="outline"
														className="border-[#252a36] text-red-400"
														disabled={
															!desktop ||
															removeRuntime.isPending ||
															installRuntime.isPending
														}
														onClick={() => removeRuntime.mutate(runtime.id)}
													>
														Remove
													</Button>
												) : null}
											</div>
										</div>
									</li>
								))}
							</ul>
						</div>
					) : null}
				</CardContent>
			</Card>

			<Card className={panelClassName}>
				<CardHeader>
					<CardTitle>CloakBrowser Installation</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<SettingRow
						label="Executable"
						value={
							<span className="break-all font-mono text-xs">
								{installation?.executable ?? "Not configured"}
							</span>
						}
					/>
					<SettingRow
						label="Installation directory"
						value={
							<span className="break-all font-mono text-xs">
								{installation?.root_dir ?? "—"}
							</span>
						}
					/>
					<SettingRow
						label="Cache directory"
						value={
							<span className="break-all font-mono text-xs">
								{installation?.cache_dir ?? "—"}
							</span>
						}
					/>
					<SettingRow label="Version" value={installation?.version ?? "—"} />
					<SettingRow
						label="Status"
						value={
							<span className={statusColor}>
								{!desktop
									? "Desktop only"
									: installation?.valid
										? installation.compatible
											? "Ready"
											: "Detected (compatibility unknown)"
										: installation?.executable
											? "Invalid"
											: "Not detected"}
							</span>
						}
					/>

					<div className="space-y-2 rounded-md border border-[#252a36] bg-[#0f1117] p-3 text-sm">
						<p className="font-medium text-[#dfe3ea]">Development setup</p>
						<p className="text-[#8b93a1]">
							Ubuntu/Linux: <code className="text-xs">pnpm cloak:setup:linux</code>
						</p>
						<p className="text-[#8b93a1]">
							Windows PowerShell:{" "}
							<code className="text-xs">pnpm cloak:setup:windows</code>
						</p>
						<p className="text-[#8b93a1] text-xs">
							Use native Windows PowerShell for CloakBrowser on Windows, not WSL.
						</p>
					</div>

					{capabilitiesQuery.data ? (
						<div className="space-y-2 border-[#252a36] border-t pt-4">
							<p className="font-medium text-[#dfe3ea] text-sm">Capabilities</p>
							<CapabilityRow
								label="Startup URLs"
								supported={capabilitiesQuery.data.startup_urls}
							/>
							<CapabilityRow
								label="Proxy"
								supported={capabilitiesQuery.data.proxy}
							/>
							<CapabilityRow
								label="Download directory"
								supported={capabilitiesQuery.data.custom_download_dir}
							/>
							<CapabilityRow
								label="Window configuration"
								supported={capabilitiesQuery.data.window_configuration}
							/>
						</div>
					) : null}

					{(discoveredQuery.data ?? []).length > 0 ? (
						<div className="space-y-2 border-[#252a36] border-t pt-4">
							<p className="font-medium text-[#dfe3ea] text-sm">
								Discovered installations
							</p>
							<ul className="space-y-2">
								{(discoveredQuery.data ?? []).map((item) => (
									<li
										key={item.executable}
										className="rounded-md border border-[#252a36] p-3 text-sm"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="min-w-0">
												<p className="truncate font-mono text-[#dfe3ea] text-xs">
													{item.executable}
												</p>
												<p className="text-[#8b93a1] text-xs">
													{item.version ?? "unknown version"} · {item.source}
												</p>
											</div>
											<Button
												size="sm"
												variant="outline"
												className="shrink-0 border-[#252a36]"
												disabled={!desktop || !item.valid || setExecutable.isPending}
												onClick={() => setExecutable.mutate(item.executable)}
											>
												Use
											</Button>
										</div>
									</li>
								))}
							</ul>
						</div>
					) : null}

					<div className="space-y-2 border-[#252a36] border-t pt-4">
						<Label htmlFor="browser-executable">Manual executable path</Label>
						<Input
							id="browser-executable"
							className="border-[#252a36] bg-[#0f1117]"
							placeholder="~/.cloakbrowser/chromium-.../chrome"
							value={executablePath}
							onChange={(event) => setExecutablePath(event.target.value)}
						/>
						<div className="flex flex-wrap gap-2">
							<Button
								className="bg-sky-600 hover:bg-sky-500"
								disabled={!desktop || autoConfigure.isPending}
								onClick={() => autoConfigure.mutate()}
							>
								Auto-detect
							</Button>
							<Button
								className="bg-sky-600 hover:bg-sky-500"
								disabled={
									!desktop || !executablePath || setExecutable.isPending
								}
								onClick={() => setExecutable.mutate(executablePath)}
							>
								Save executable
							</Button>
							<Button
								variant="outline"
								className="border-[#252a36]"
								disabled={!desktop || validateInstallation.isPending}
								onClick={() => validateInstallation.mutate()}
							>
								Validate installation
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</PageShell>
	);
}

function SettingRow({ label, value }: { label: string; value: ReactNode }) {
	return (
		<div className="grid gap-1 border-[#252a36] border-b py-2 text-sm last:border-0">
			<span className="text-[#8b93a1]">{label}</span>
			<div className="text-[#dfe3ea]">{value}</div>
		</div>
	);
}

function CapabilityRow({
	label,
	supported,
}: {
	label: string;
	supported: boolean;
}) {
	return (
		<div className="flex justify-between text-sm">
			<span className="text-[#8b93a1]">{label}</span>
			<span className={supported ? "text-emerald-400" : "text-[#8b93a1]"}>
				{supported ? "Supported" : "Unsupported"}
			</span>
		</div>
	);
}
