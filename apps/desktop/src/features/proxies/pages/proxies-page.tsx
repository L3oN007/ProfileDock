import { Button } from "@ProfileDock/ui/components/button";
import { Input } from "@ProfileDock/ui/components/input";
import { Skeleton } from "@ProfileDock/ui/components/skeleton";
import { RouterLink } from "@/components/router-link";
import { Archive, Plus, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { notion } from "@/app/design/system";
import {
	ContentSection,
	EmptyState,
	PageShell,
	PageTitle,
} from "@/app/layout/page-shell";
import {
	useArchiveProxy,
	useCheckProxy,
} from "@/features/proxies/api/mutations";
import { useProxies } from "@/features/proxies/api/queries";
import { CreateProxyDialog } from "@/features/proxies/components/create-proxy-dialog";
import { ProxyHealthBadge } from "@/features/proxies/components/proxy-health-badge";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";
import { FilterSelect } from "@/features/shared/filter-select";
import { isDesktopRuntime } from "@/lib/tauri/runtime";
import type { ProxyHealthStatus, Proxy as ProxyRecord } from "@/types/proxy";

const STATUS_OPTIONS = [
	{ value: "all", label: "All status" },
	{ value: "healthy", label: "Healthy" },
	{ value: "unhealthy", label: "Unhealthy" },
	{ value: "unknown", label: "Unknown" },
];

export function ProxiesPage() {
	const desktop = isDesktopRuntime();
	const [search, setSearch] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [statusFilter, setStatusFilter] = useState<"all" | ProxyHealthStatus>(
		"all",
	);

	const proxiesQuery = useProxies();
	const checkProxy = useCheckProxy();
	const archiveProxy = useArchiveProxy();

	const proxies = useMemo(() => {
		const list = proxiesQuery.data ?? [];
		const query = search.trim().toLowerCase();

		return list.filter((proxy) => {
			const matchesSearch =
				!query ||
				proxy.name.toLowerCase().includes(query) ||
				proxy.host.toLowerCase().includes(query);
			const matchesStatus =
				statusFilter === "all" || proxy.healthStatus === statusFilter;
			return matchesSearch && matchesStatus;
		});
	}, [proxiesQuery.data, search, statusFilter]);

	return (
		<PageShell>
			<PageTitle
				title="Proxies"
				description="Manage proxy endpoints and health checks for your profiles."
				actions={
					<Button size="sm" onClick={() => setCreateOpen(true)}>
						<Plus className="size-3.5" />
						Add proxy
					</Button>
				}
			/>
			{!desktop ? <DesktopOnlyBanner /> : null}
			<ContentSection
				title="All proxies"
				actions={
					<div className="flex flex-wrap items-center gap-2">
						<div className="relative min-w-[200px]">
							<Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
							<Input
								className={`${notion.input} pl-8`}
								placeholder="Search proxies..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
							/>
						</div>
						<FilterSelect
							value={statusFilter}
							onValueChange={(value) =>
								setStatusFilter(value as "all" | ProxyHealthStatus)
							}
							options={STATUS_OPTIONS}
						/>
					</div>
				}
				contentClassName="space-y-3"
			>
				{proxiesQuery.isLoading ? (
					<div className="space-y-2">
						<Skeleton className="h-24 w-full rounded-lg" />
						<Skeleton className="h-24 w-full rounded-lg" />
					</div>
				) : proxies.length === 0 ? (
					<EmptyState
						title="No proxies yet"
						description="Add your first proxy to assign it to profiles."
					/>
				) : (
					proxies.map((proxy) => (
						<ProxyCard
							key={proxy.id}
							proxy={proxy}
							onCheck={() => checkProxy.mutate(proxy.id)}
							onArchive={() => archiveProxy.mutate(proxy.id)}
							isChecking={checkProxy.isPending}
						/>
					))
				)}
			</ContentSection>

			<CreateProxyDialog open={createOpen} onOpenChange={setCreateOpen} />
		</PageShell>
	);
}

function ProxyCard({
	proxy,
	onCheck,
	onArchive,
	isChecking,
}: {
	proxy: ProxyRecord;
	onCheck: () => void;
	onArchive: () => void;
	isChecking: boolean;
}) {
	return (
		<div className={notion.listRow}>
			<div className="flex min-w-0 flex-1 flex-col gap-3">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap items-center gap-2">
							<RouterLink
								to="/proxies/$proxyId"
								params={{ proxyId: proxy.id }}
								className="font-medium text-foreground hover:text-primary"
							>
								{proxy.name}
							</RouterLink>
							<ProxyHealthBadge status={proxy.healthStatus} />
						</div>
						<p className="mt-1 text-muted-foreground text-xs uppercase">
							{proxy.protocol}
						</p>
						<p className="font-mono text-foreground text-sm">
							{proxy.host}:{proxy.port}
						</p>
					</div>

					<div className="flex gap-2">
						<Button
							size="sm"
							variant="outline"
							disabled={isChecking}
							onClick={onCheck}
						>
							<RefreshCw className="size-3.5" />
							Check
						</Button>
						<Button
							size="sm"
							variant="outline"
							disabled={proxy.assignedProfileCount > 0}
							onClick={onArchive}
						>
							<Archive className="size-3.5" />
							Archive
						</Button>
					</div>
				</div>

				<div className="grid gap-2 text-sm sm:grid-cols-3">
					<Meta label="IP" value={proxy.lastCheck?.observedIp ?? "—"} />
					<Meta
						label="Latency"
						value={
							proxy.lastCheck?.latencyMs != null
								? `${proxy.lastCheck.latencyMs}ms`
								: "—"
						}
					/>
					<Meta
						label="Used by"
						value={`${proxy.assignedProfileCount} profiles`}
					/>
				</div>
			</div>
		</div>
	);
}

function Meta({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className="text-muted-foreground text-xs">{label}</p>
			<p className="text-foreground">{value}</p>
		</div>
	);
}
