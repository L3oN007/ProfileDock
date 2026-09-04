import { Badge } from "@ProfileDock/ui/components/badge";

import type { ProxyHealthStatus } from "@/types/proxy";

const STATUS_CONFIG: Record<
	ProxyHealthStatus,
	{ label: string; className: string }
> = {
	healthy: {
		label: "Healthy",
		className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
	},
	unhealthy: {
		label: "Unhealthy",
		className: "bg-red-500/15 text-red-400 border-red-500/30",
	},
	unknown: {
		label: "Unknown",
		className: "bg-accent text-muted-foreground border-border",
	},
};

export function ProxyHealthBadge({ status }: { status: ProxyHealthStatus }) {
	const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;

	return (
		<Badge variant="outline" className={config.className}>
			<span className="mr-1.5 inline-block size-1.5 rounded-full bg-current" />
			{config.label}
		</Badge>
	);
}
