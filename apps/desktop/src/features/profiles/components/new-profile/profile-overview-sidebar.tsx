import { TagBadgeList } from "@/features/tags/components/tag-badge";
import { Button } from "@ProfileDock/ui/components/button";
import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";
import {
	buildPlatformLabel,
	type OsFamily,
	previewUserAgent,
} from "@/features/profiles/lib/platform-config";
import type { CloakCapabilities } from "@/types/cloak";
import type { CreateProfileDeviceInput } from "@/types/device";
import type { CreateProfileFullInput } from "@/types/profile";

interface ProfileOverviewSidebarProps {
	form: CreateProfileFullInput;
	osFamily: OsFamily;
	osVersion: string;
	groupName: string;
	proxySummary: string;
	capabilities: CloakCapabilities | undefined;
	previewSeed: number;
	device: CreateProfileDeviceInput;
	onRefreshFingerprint: () => void;
}

const PLATFORM_LABELS: Record<string, string> = {
	windows: "Windows",
	macos: "macOS",
	linux: "Linux",
};

export function ProfileOverviewSidebar({
	form,
	osFamily,
	osVersion,
	groupName,
	proxySummary,
	capabilities,
	previewSeed,
	device,
	onRefreshFingerprint,
}: ProfileOverviewSidebarProps) {
	const userAgent = previewUserAgent(osFamily, osVersion);
	const windowMode = form.browser?.windowMode ?? "normal";
	const downloadMode = form.browser?.downloadMode ?? "profile";
	const isCustom = device.mode === "custom";

	return (
		<aside className="xl:sticky xl:top-6">
			<div className="space-y-4 rounded-xl border border-border/50 bg-surface px-4 py-5">
				<div className="flex items-start justify-between gap-3">
					<div>
						<h2 className="font-medium text-foreground text-sm">Overview</h2>
						<p className="mt-0.5 text-muted-foreground text-xs">
							Live summary of profile identity and CloakBrowser settings.
						</p>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="h-7 shrink-0 gap-1.5 px-2 text-primary"
						onClick={onRefreshFingerprint}
					>
						<RefreshCw className="size-3.5" />
						Refresh
					</Button>
				</div>

				<dl className="space-y-0">
					<OverviewSection title="General" />
					<OverviewRow label="Name" value={form.name || "—"} />
					<OverviewRow label="Group" value={groupName} />
					<OverviewRow
						label="Tags"
						value={
							(form.tagItems ?? []).length > 0 ? (
								<TagBadgeList
									tags={form.tagItems ?? []}
									className="justify-end"
								/>
							) : (
								"—"
							)
						}
					/>

					<OverviewSection title="Network" />
					<OverviewRow label="Proxy" value={proxySummary} />

					<OverviewSection title="Device" />
					<OverviewRow label="Browser" value="CloakBrowser" />
					<OverviewRow
						label="Platform"
						value={PLATFORM_LABELS[device.platform ?? "windows"] ?? "Windows"}
					/>
					<OverviewRow
						label="CPU"
						value={
							isCustom
								? formatCustom(device.hardwareConcurrency, "cores")
								: "Auto"
						}
					/>
					<OverviewRow
						label="RAM"
						value={
							isCustom ? formatCustom(device.deviceMemoryGb, "GB") : "Auto"
						}
					/>
					<OverviewRow
						label="Screen"
						value={
							isCustom && device.screenWidth && device.screenHeight
								? `${device.screenWidth}×${device.screenHeight}`
								: "Auto"
						}
					/>
					<OverviewRow
						label="GPU"
						value={
							device.hardwarePresetId ? "Preset" : isCustom ? "Custom" : "Auto"
						}
					/>
					<OverviewRow label="Fingerprint seed" value={String(previewSeed)} />
					<OverviewRow
						label="Fingerprint"
						value={device.mode === "automatic" ? "Fixed (automatic)" : "Custom"}
					/>

					<OverviewSection title="Environment" />
					<OverviewRow
						label="Timezone"
						value={envLabel(device.timezoneMode, device.timezone)}
					/>
					<OverviewRow
						label="Locale"
						value={envLabel(device.localeMode, device.locale)}
					/>
					<OverviewRow label="WebRTC" value={webrtcLabel(device.webrtcMode)} />

					<OverviewSection title="Browser" />
					<OverviewRow
						label="User-Agent"
						value={
							<span className="line-clamp-2 font-mono text-[10px] leading-relaxed">
								{userAgent}
							</span>
						}
					/>
					<OverviewRow
						label="Window"
						value={windowMode === "maximized" ? "Maximized" : "Normal"}
						configurable={capabilities?.window_configuration !== false}
					/>
					<OverviewRow
						label="Restore session"
						value={form.browser?.restoreSession ? "Enabled" : "Disabled"}
					/>
					<OverviewRow
						label="Startup URLs"
						value={String(form.browser?.startupUrls?.length ?? 0)}
						configurable={capabilities?.startup_urls !== false}
					/>
					<OverviewRow
						label="Downloads"
						value={
							downloadMode === "custom" ? "Custom directory" : "Profile folder"
						}
						configurable={capabilities?.custom_download_dir !== false}
					/>
					<OverviewRow label="Canvas / WebGL" value="Cloak managed" />
				</dl>

				<p className="border-border/50 border-t pt-3 text-[11px] text-muted-foreground leading-relaxed">
					OS label ({buildPlatformLabel(osFamily, osVersion)}) is
					organizational. Device fingerprint is persisted per profile and passed
					to CloakBrowser at launch.
				</p>
			</div>
		</aside>
	);
}

function OverviewSection({ title }: { title: string }) {
	return (
		<div className="pt-3 pb-1 first:pt-0">
			<p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
				{title}
			</p>
		</div>
	);
}

function envLabel(
	mode: CreateProfileDeviceInput["timezoneMode"],
	custom?: string,
) {
	if (mode === "custom") return custom || "Custom";
	if (mode === "system") return "System default";
	return "Based on proxy";
}

function webrtcLabel(mode: CreateProfileDeviceInput["webrtcMode"]) {
	if (mode === "real") return "Real";
	if (mode === "disabled") return "Disabled";
	return "Based on proxy";
}

function formatCustom(value: number | undefined, suffix: string) {
	return value ? `${value} ${suffix}` : "Auto";
}

function OverviewRow({
	label,
	value,
	configurable,
}: {
	label: string;
	value: ReactNode;
	configurable?: boolean;
}) {
	return (
		<div className="flex items-start justify-between gap-4 border-border/40 border-b py-2.5 last:border-0">
			<dt className="shrink-0 text-muted-foreground text-xs">{label}</dt>
			<dd className="min-w-0 max-w-[62%] text-right text-foreground text-xs">
				{value}
				{configurable === false ? (
					<span className="mt-0.5 block text-[10px] text-amber-600">
						Not supported by runtime
					</span>
				) : null}
			</dd>
		</div>
	);
}
