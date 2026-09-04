import { Badge } from "@ProfileDock/ui/components/badge";
import { cn } from "@ProfileDock/ui/lib/utils";
import type { ReactNode } from "react";

import { notion } from "@/app/design/system";
import type { CloakCapabilities } from "@/types/cloak";
import type { CreateProfileFullInput } from "@/types/profile";

interface ProfileFingerprintTabProps {
	form: CreateProfileFullInput;
	capabilities: CloakCapabilities | undefined;
}

export function ProfileFingerprintTab({
	form,
	capabilities,
}: ProfileFingerprintTabProps) {
	return (
		<div className="space-y-8">
			<section className="space-y-4">
				<div>
					<h3 className="font-medium text-foreground text-sm">
						Configurable in ProfileDock
					</h3>
					<p className="mt-1 text-muted-foreground text-xs">
						These settings are passed to CloakBrowser when the profile launches.
					</p>
				</div>
				<div className="divide-y divide-border/40 rounded-lg border border-border/50 bg-surface">
					<FingerprintRow
						label="Proxy"
						value={
							form.proxyMode === "saved"
								? "Saved proxy"
								: form.proxyMode === "custom"
									? "Custom proxy"
									: "No proxy"
						}
						status="configurable"
						supported={capabilities?.proxy !== false}
						hint="Configure in the Proxy tab."
					/>
					<FingerprintRow
						label="Window mode"
						value={
							form.browser?.windowMode === "maximized" ? "Maximized" : "Normal"
						}
						status="configurable"
						supported={capabilities?.window_configuration !== false}
						hint="Configure in the Browser tab."
					/>
					<FingerprintRow
						label="Restore session"
						value={form.browser?.restoreSession ? "Enabled" : "Disabled"}
						status="configurable"
						supported
						hint="Configure in the Browser tab."
					/>
					<FingerprintRow
						label="Startup URLs"
						value={`${form.browser?.startupUrls?.length ?? 0} URL(s)`}
						status="configurable"
						supported={capabilities?.startup_urls !== false}
						hint="Configure in the Browser tab."
					/>
					<FingerprintRow
						label="Download directory"
						value={
							form.browser?.downloadMode === "custom"
								? "Custom path"
								: "Profile downloads folder"
						}
						status="configurable"
						supported={capabilities?.custom_download_dir !== false}
						hint="Configure in the Browser tab."
					/>
				</div>
			</section>

			<section className="space-y-4">
				<div>
					<h3 className="font-medium text-foreground text-sm">
						Managed by CloakBrowser
					</h3>
					<p className="mt-1 text-muted-foreground text-xs">
						Identity and fingerprint signals are handled by the CloakBrowser
						runtime. ProfileDock does not spoof hardware or browser APIs.
					</p>
				</div>
				<div className="divide-y divide-border/40 rounded-lg border border-border/50 bg-surface">
					<FingerprintRow
						label="User-Agent"
						value="Runtime default"
						status="runtime"
					/>
					<FingerprintRow
						label="WebRTC"
						value="Runtime default"
						status="runtime"
					/>
					<FingerprintRow
						label="Timezone / Location"
						value="Runtime default"
						status="runtime"
					/>
					<FingerprintRow
						label="Language"
						value="Runtime default"
						status="runtime"
					/>
					<FingerprintRow
						label="Screen resolution"
						value="Runtime default"
						status="runtime"
					/>
					<FingerprintRow
						label="Fonts"
						value="Runtime default"
						status="runtime"
					/>
					<FingerprintRow
						label="Canvas"
						value="Runtime default"
						status="runtime"
					/>
					<FingerprintRow
						label="WebGL / AudioContext"
						value="Runtime default"
						status="runtime"
					/>
					<FingerprintRow
						label="Media devices"
						value="Runtime default"
						status="runtime"
					/>
				</div>
			</section>
		</div>
	);
}

function FingerprintRow({
	label,
	value,
	status,
	supported = true,
	hint,
}: {
	label: string;
	value: ReactNode;
	status: "configurable" | "runtime";
	supported?: boolean;
	hint?: string;
}) {
	return (
		<div className="flex items-start justify-between gap-4 px-4 py-3">
			<div className="min-w-0 space-y-0.5">
				<p className="font-medium text-foreground text-sm">{label}</p>
				{hint ? <p className={cn(notion.fieldHint)}>{hint}</p> : null}
			</div>
			<div className="shrink-0 text-right">
				<p className="text-foreground text-sm">{value}</p>
				<Badge
					variant={
						status === "configurable"
							? supported
								? "info"
								: "warning"
							: "neutral"
					}
					className="mt-1"
				>
					{status === "configurable"
						? supported
							? "Configurable"
							: "Unsupported"
						: "CloakBrowser"}
				</Badge>
			</div>
		</div>
	);
}
