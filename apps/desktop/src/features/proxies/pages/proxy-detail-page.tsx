import { Button } from "@ProfileDock/ui/components/button";
import { Skeleton } from "@ProfileDock/ui/components/skeleton";
import { RouterLink } from "@/components/router-link";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { DetailRow, PageShell, SectionBlock } from "@/app/layout/page-shell";
import { RouterButton } from "@/components/router-button";
import { useCheckProxy } from "@/features/proxies/api/mutations";
import {
	useProxy,
	useProxyAssignments,
	useProxyChecks,
} from "@/features/proxies/api/queries";
import { ProxyHealthBadge } from "@/features/proxies/components/proxy-health-badge";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";

interface ProxyDetailPageProps {
	proxyId: string;
}

export function ProxyDetailPage({ proxyId }: ProxyDetailPageProps) {
	const proxyQuery = useProxy(proxyId);
	const checksQuery = useProxyChecks(proxyId);
	const assignmentsQuery = useProxyAssignments(proxyId);
	const checkProxy = useCheckProxy();

	const proxy = proxyQuery.data;

	return (
		<PageShell>
			<div className="flex items-center gap-3">
				<RouterButton to="/proxies" variant="ghost" size="icon-sm">
					<ArrowLeft className="size-4" />
				</RouterButton>
				<div className="flex-1">
					{proxyQuery.isLoading ? (
						<Skeleton className="h-7 w-48" />
					) : proxy ? (
						<div className="flex items-center gap-2">
							<h2 className="font-medium text-foreground text-lg">
								{proxy.name}
							</h2>
							<ProxyHealthBadge status={proxy.healthStatus} />
						</div>
					) : null}
				</div>
				{proxy ? (
					<Button
						variant="outline"
						disabled={checkProxy.isPending}
						onClick={() => checkProxy.mutate(proxy.id)}
					>
						<RefreshCw className="size-3.5" />
						Check
					</Button>
				) : null}
			</div>

			<DesktopOnlyBanner />

			<div className="grid gap-8 lg:grid-cols-2">
				<SectionBlock title="Connection">
					<div>
						<DetailRow
							label="Protocol"
							value={proxy?.protocol.toUpperCase() ?? "—"}
						/>
						<DetailRow label="Host" value={proxy?.host ?? "—"} />
						<DetailRow label="Port" value={proxy?.port?.toString() ?? "—"} />
						<DetailRow
							label="Authentication"
							value={proxy?.hasAuth ? "Enabled" : "Disabled"}
						/>
					</div>
				</SectionBlock>

				<SectionBlock title="Last check">
					<div>
						<DetailRow label="Status" value={proxy?.healthStatus ?? "—"} />
						<DetailRow
							label="Observed IP"
							value={proxy?.lastCheck?.observedIp ?? "—"}
						/>
						<DetailRow
							label="Latency"
							value={
								proxy?.lastCheck?.latencyMs != null
									? `${proxy.lastCheck.latencyMs}ms`
									: "—"
							}
						/>
						<DetailRow
							label="Checked"
							value={
								proxy?.lastCheck?.checkedAt
									? new Date(proxy.lastCheck.checkedAt).toLocaleString()
									: "—"
							}
						/>
					</div>
				</SectionBlock>
			</div>

			<SectionBlock title="Assignments">
				{assignmentsQuery.isLoading ? (
					<Skeleton className="h-12 w-full rounded-lg" />
				) : (assignmentsQuery.data ?? []).length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Not assigned to any profile.
					</p>
				) : (
					<ul className="divide-y divide-border/50">
						{(assignmentsQuery.data ?? []).map((assignment) => (
							<li key={assignment.profileId} className="py-2 text-sm">
								<RouterLink
									to="/profiles/$profileId"
									params={{ profileId: assignment.profileId }}
									className="text-primary hover:underline"
								>
									{assignment.profileName}
								</RouterLink>
							</li>
						))}
					</ul>
				)}
			</SectionBlock>

			<SectionBlock title="Recent checks">
				{checksQuery.isLoading ? (
					<Skeleton className="h-16 w-full rounded-lg" />
				) : (
					<ul className="divide-y divide-border/50">
						{(checksQuery.data ?? []).map((check) => (
							<li
								key={check.checkedAt}
								className="flex justify-between gap-4 py-3 text-sm"
							>
								<span className="text-muted-foreground">
									{new Date(check.checkedAt).toLocaleString()}
								</span>
								<span
									className={
										check.success ? "text-emerald-400" : "text-red-400"
									}
								>
									{check.success ? "Success" : "Failed"}
									{check.latencyMs != null ? ` · ${check.latencyMs}ms` : ""}
								</span>
							</li>
						))}
						{(checksQuery.data ?? []).length === 0 ? (
							<li className="py-4 text-muted-foreground text-sm">
								No checks yet
							</li>
						) : null}
					</ul>
				)}
			</SectionBlock>
		</PageShell>
	);
}
