import { Badge } from "@ProfileDock/ui/components/badge";

import type { ProfileState } from "@/types/profile";

const stateConfig: Record<
	ProfileState,
	{
		label: string;
		variant: "info" | "success" | "danger" | "neutral";
	}
> = {
	ready: { label: "Ready", variant: "info" },
	running: { label: "Running", variant: "success" },
	error: { label: "Error", variant: "danger" },
	archived: { label: "Archived", variant: "neutral" },
};

export function ProfileStatusBadge({ state }: { state: ProfileState }) {
	const config = stateConfig[state] ?? stateConfig.ready;

	return <Badge variant={config.variant}>{config.label}</Badge>;
}
