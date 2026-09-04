import { Button } from "@ProfileDock/ui/components/button";
import { Input } from "@ProfileDock/ui/components/input";
import { Skeleton } from "@ProfileDock/ui/components/skeleton";
import { Link } from "@tanstack/react-router";
import { Archive, Plus, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { PageShell, panelClassName } from "@/app/layout/page-shell";
import { useArchiveProxy, useCheckProxy } from "@/features/proxies/api/mutations";
import { useProxies } from "@/features/proxies/api/queries";
import { CreateProxyDialog } from "@/features/proxies/components/create-proxy-dialog";
import { ProxyHealthBadge } from "@/features/proxies/components/proxy-health-badge";
import { DesktopOnlyBanner } from "@/features/shared/desktop-only-banner";
import { isDesktopRuntime } from "@/lib/tauri/runtime";
import type { Proxy, ProxyHealthStatus } from "@/types/proxy";

export function ProxiesPage() {
	const desktop = isDesktopRuntime();
	const [search, setSearch] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [statusFilter, setStatusFilter] = useState<"all" | ProxyHealthStatus>("all");

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
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="relative max-w-md flex-1">
					<Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-[#8b93a1]" />
					<Input
						className="h-8 border-[#252a36] bg-[#12161f] pl-8"
						placeholder="Search proxies..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>

				<div className="flex items-center gap-2">
					<select
						className="h-8 rounded-md border border-[#252a36] bg-[#12161f] px-2 text-sm"
						value={statusFilter}
						onChange={(e) =>
							setStatusFilter(e.target.value as "all" | ProxyHealthStatus)
						}
					>
						<option value="all">All status</option>
						<option value="healthy">Healthy</option>
						<option value="unhealthy">Unhealthy</option>
						<option value="unknown">Unknown</option>
					</select>

					<Button
						className="bg-sky-600 hover:bg-sky-500"
						size="sm"
						onClick={() => setCreateOpen(true)}
					>
						<Plus className="size-3.5" />
						Add Proxy
					</Button>
				</div>
			</div>

			{!desktop ? <DesktopOnlyBanner /> : null}

			{proxiesQuery.isLoading ? (
				<div className="space-y-2">
					<Skeleton className="h-24 w-full" />
					<Skeleton className="h-24 w-full" />
				</div>
			) : proxies.length === 0 ? (
				<div className={`rounded-lg p-8 text-center ${panelClassName}`}>
					<p className="text-[#8b93a1]">No proxies yet. Add your first proxy.</p>
				</div>
			) : (
				<div className="space-y-3">
					{proxies.map((proxy) => (
						<ProxyCard
							key={proxy.id}
							proxy={proxy}
							onCheck={() => checkProxy.mutate(proxy.id)}
							onArchive={() => archiveProxy.mutate(proxy.id)}
							isChecking={checkProxy.isPending}
						/>
					))}
				</div>
			)}

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
	proxy: Proxy;
	onCheck: () => void;
	onArchive: () => void;
	isChecking: boolean;
}) {
	return (
		<div className={`rounded-lg p-4 ${panelClassName}`}>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<Link
							to="/proxies/$proxyId"
							params={{ proxyId: proxy.id }}
							className="font-medium text-[#eef1f6] hover:text-sky-400"
						>
							{proxy.name}
						</Link>
						<ProxyHealthBadge status={proxy.healthStatus} />
					</div>
					<p className="mt-1 text-[#8b93a1] text-xs uppercase">{proxy.protocol}</p>
					<p className="font-mono text-[#c5cdd8] text-sm">
						{proxy.host}:{proxy.port}
					</p>
				</div>

				<div className="flex gap-2">
					<Button
						size="sm"
						variant="outline"
						className="border-[#252a36]"
						disabled={isChecking}
						onClick={onCheck}
					>
						<RefreshCw className="size-3.5" />
						Check
					</Button>
					<Button
						size="sm"
						variant="outline"
						className="border-[#252a36]"
						disabled={proxy.assignedProfileCount > 0}
						onClick={onArchive}
					>
						<Archive className="size-3.5" />
						Archive
					</Button>
				</div>
			</div>

			<div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
				<Meta label="IP" value={proxy.lastCheck?.observedIp ?? "—"} />
				<Meta
					label="Latency"
					value={
						proxy.lastCheck?.latencyMs != null
							? `${proxy.lastCheck.latencyMs}ms`
							: "—"
					}
				/>
				<Meta label="Used by" value={`${proxy.assignedProfileCount} profiles`} />
			</div>
		</div>
	);
}

function Meta({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className="text-[#6f7888] text-xs">{label}</p>
			<p className="text-[#dfe3ea]">{value}</p>
		</div>
	);
}
