import { cn } from "@ProfileDock/ui/lib/utils";
import type { ReactNode } from "react";

import { notion } from "@/app/design/system";

export function FormField({
	label,
	hint,
	children,
	className,
}: {
	label: string;
	hint?: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("space-y-1.5", className)}>
			<span className={notion.fieldLabel}>{label}</span>
			{children}
			{hint ? <p className={notion.fieldHint}>{hint}</p> : null}
		</div>
	);
}
