import { Badge } from "@ProfileDock/ui/components/badge";

import type { ProfileState } from "@/types/profile";

const stateConfig: Record<
	ProfileState,
	{
		label: string;
		dot: string;
	}
> = {
	ready: { label: "Ready", dot: "bg-chart-1" },
	running: { label: "Running", dot: "bg-chart-4" },
	error: { label: "Error", dot: "bg-destructive" },
	archived: { label: "Archived", dot: "bg-muted-foreground" },
};

export function ProfileStatusBadge({ state }: { state: ProfileState }) {
	const config = stateConfig[state] ?? stateConfig.ready;

	return (
		<Badge variant="secondary" className="gap-1.5 font-normal">
			<span className={`size-1.5 rounded-full ${config.dot}`} />
			{config.label}
		</Badge>
	);
}
