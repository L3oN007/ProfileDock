import { Badge } from "@ProfileDock/ui/components/badge";
import { Button } from "@ProfileDock/ui/components/button";
import { RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import type { CloakCapabilities } from "@/types/cloak";
import type { CreateProfileFullInput } from "@/types/profile";

import {
	type OsFamily,
	buildPlatformLabel,
	previewUserAgent,
} from "@/features/profiles/lib/platform-config";

interface ProfileOverviewSidebarProps {
	form: CreateProfileFullInput;
	osFamily: OsFamily;
	osVersion: string;
	groupName: string;
	proxySummary: string;
	capabilities: CloakCapabilities | undefined;
	onRefreshFingerprint: () => void;
}

export function ProfileOverviewSidebar({
	form,
	osFamily,
	osVersion,
	groupName,
	proxySummary,
	capabilities,
	onRefreshFingerprint,
}: ProfileOverviewSidebarProps) {
	const userAgent = previewUserAgent(osFamily, osVersion);
	const windowMode = form.browser?.windowMode ?? "normal";
	const downloadMode = form.browser?.downloadMode ?? "profile";

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
					<OverviewRow label="Name" value={form.name || "—"} />
					<OverviewRow label="Group" value={groupName} />
					<OverviewRow
						label="Tags"
						value={
							(form.tags ?? []).length > 0 ? (
								<div className="flex flex-wrap justify-end gap-1">
									{(form.tags ?? []).map((tag) => (
										<Badge key={tag} variant="neutral">
											{tag}
										</Badge>
									))}
								</div>
							) : (
								"—"
							)
						}
					/>
					<OverviewRow label="Browser" value="CloakBrowser" />
					<OverviewRow
						label="OS"
						value={buildPlatformLabel(osFamily, osVersion)}
					/>
					<OverviewRow
						label="User-Agent"
						value={
							<span className="line-clamp-3 font-mono text-[10px] leading-relaxed">
								{userAgent}
							</span>
						}
					/>
					<OverviewRow label="Proxy" value={proxySummary} />
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
							downloadMode === "custom"
								? "Custom directory"
								: "Profile folder"
						}
						configurable={capabilities?.custom_download_dir !== false}
					/>
					<OverviewRow label="WebRTC" value="CloakBrowser default" />
					<OverviewRow label="Timezone" value="CloakBrowser default" />
					<OverviewRow label="Language" value="CloakBrowser default" />
					<OverviewRow label="Canvas / WebGL" value="CloakBrowser default" />
				</dl>

				<p className="border-border/50 border-t pt-3 text-muted-foreground text-[11px] leading-relaxed">
					Fingerprint identity is managed by CloakBrowser. ProfileDock configures
					proxy, startup, window, and download behavior only.
				</p>
			</div>
		</aside>
	);
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
