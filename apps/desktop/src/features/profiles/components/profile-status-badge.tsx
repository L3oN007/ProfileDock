import { Badge } from "@ProfileDock/ui/components/badge";

import type { ProfileState } from "@/types/profile";

const stateConfig: Record<
	ProfileState,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
	}
> = {
	ready: { label: "Ready", variant: "secondary" },
	running: { label: "Running", variant: "default" },
	error: { label: "Error", variant: "destructive" },
	archived: { label: "Archived", variant: "outline" },
};

export function ProfileStatusBadge({ state }: { state: ProfileState }) {
	const config = stateConfig[state] ?? stateConfig.ready;

	return (
		<Badge variant={config.variant} className="gap-1.5">
			<span
				className={`size-1.5 rounded-full ${
					state === "running"
						? "bg-emerald-400"
						: state === "error"
							? "bg-red-400"
							: state === "ready"
								? "bg-sky-400"
								: "bg-muted-foreground"
				}`}
			/>
			{config.label}
		</Badge>
	);
}
