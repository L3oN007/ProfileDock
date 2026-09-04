import { Button } from "@ProfileDock/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ProfileDock/ui/components/card";
import { Skeleton } from "@ProfileDock/ui/components/skeleton";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { PageShell, panelClassName } from "@/app/layout/page-shell";
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
				<Button variant="ghost" size="icon-sm" render={<Link to="/proxies" />}>
					<ArrowLeft className="size-4" />
				</Button>
				<div className="flex-1">
					{proxyQuery.isLoading ? (
						<Skeleton className="h-7 w-48" />
					) : proxy ? (
						<div className="flex items-center gap-2">
							<h2 className="font-medium text-[#eef1f6] text-lg">{proxy.name}</h2>
							<ProxyHealthBadge status={proxy.healthStatus} />
						</div>
					) : null}
				</div>
				{proxy ? (
					<Button
						variant="outline"
						className="border-[#252a36]"
						disabled={checkProxy.isPending}
						onClick={() => checkProxy.mutate(proxy.id)}
					>
						<RefreshCw className="size-3.5" />
						Check
					</Button>
				) : null}
			</div>

			<DesktopOnlyBanner />

			<div className="grid gap-4 lg:grid-cols-2">
				<Card className={panelClassName}>
					<CardHeader>
						<CardTitle>Connection</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						<Row label="Protocol" value={proxy?.protocol.toUpperCase() ?? "—"} />
						<Row label="Host" value={proxy?.host ?? "—"} />
						<Row label="Port" value={proxy?.port?.toString() ?? "—"} />
						<Row
							label="Authentication"
							value={proxy?.hasAuth ? "Enabled" : "Disabled"}
						/>
					</CardContent>
				</Card>

				<Card className={panelClassName}>
					<CardHeader>
						<CardTitle>Last Check</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2 text-sm">
						<Row label="Status" value={proxy?.healthStatus ?? "—"} />
						<Row label="Observed IP" value={proxy?.lastCheck?.observedIp ?? "—"} />
						<Row
							label="Latency"
							value={
								proxy?.lastCheck?.latencyMs != null
									? `${proxy.lastCheck.latencyMs}ms`
									: "—"
							}
						/>
						<Row
							label="Checked"
							value={
								proxy?.lastCheck?.checkedAt
									? new Date(proxy.lastCheck.checkedAt).toLocaleString()
									: "—"
							}
						/>
					</CardContent>
				</Card>
			</div>

			<Card className={panelClassName}>
				<CardHeader>
					<CardTitle>Assignments</CardTitle>
				</CardHeader>
				<CardContent>
					{assignmentsQuery.isLoading ? (
						<Skeleton className="h-12 w-full" />
					) : (assignmentsQuery.data ?? []).length === 0 ? (
						<p className="text-[#8b93a1] text-sm">Not assigned to any profile.</p>
					) : (
						<ul className="space-y-2 text-sm">
							{(assignmentsQuery.data ?? []).map((assignment) => (
								<li key={assignment.profileId}>
									<Link
										to="/profiles/$profileId"
										params={{ profileId: assignment.profileId }}
										className="text-sky-400 hover:underline"
									>
										{assignment.profileName}
									</Link>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>

			<Card className={panelClassName}>
				<CardHeader>
					<CardTitle>Recent Checks</CardTitle>
				</CardHeader>
				<CardContent>
					{checksQuery.isLoading ? (
						<Skeleton className="h-16 w-full" />
					) : (
						<ul className="space-y-2 text-sm">
							{(checksQuery.data ?? []).map((check) => (
								<li
									key={check.checkedAt}
									className="flex justify-between gap-4 border-[#252a36] border-b py-2 last:border-0"
								>
									<span className="text-[#8b93a1]">
										{new Date(check.checkedAt).toLocaleString()}
									</span>
									<span className={check.success ? "text-emerald-400" : "text-red-400"}>
										{check.success ? "Success" : "Failed"}
										{check.latencyMs != null ? ` · ${check.latencyMs}ms` : ""}
									</span>
								</li>
							))}
							{(checksQuery.data ?? []).length === 0 ? (
								<li className="text-[#8b93a1]">No checks yet</li>
							) : null}
						</ul>
					)}
				</CardContent>
			</Card>
		</PageShell>
	);
}

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex justify-between gap-4 border-[#252a36] border-b py-2 last:border-0">
			<span className="text-[#8b93a1]">{label}</span>
			<span className="text-right text-[#dfe3ea]">{value}</span>
		</div>
	);
}
