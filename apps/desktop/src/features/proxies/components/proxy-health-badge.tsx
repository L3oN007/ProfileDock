import { Badge } from "@ProfileDock/ui/components/badge";

import type { ProxyHealthStatus } from "@/types/proxy";

const STATUS_CONFIG: Record<
	ProxyHealthStatus,
	{ label: string; variant: "success" | "danger" | "neutral" }
> = {
	healthy: { label: "Healthy", variant: "success" },
	unhealthy: { label: "Unhealthy", variant: "danger" },
	unknown: { label: "Unknown", variant: "neutral" },
};

export function ProxyHealthBadge({ status }: { status: ProxyHealthStatus }) {
	const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;

	return <Badge variant={config.variant}>{config.label}</Badge>;
}
