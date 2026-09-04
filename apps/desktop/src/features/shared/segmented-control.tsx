import { cn } from "@ProfileDock/ui/lib/utils";
import type { ReactNode } from "react";

export interface SegmentedOption<T extends string> {
	value: T;
	label: ReactNode;
	disabled?: boolean;
}

export function SegmentedControl<T extends string>({
	value,
	options,
	onChange,
	className,
}: {
	value: T;
	options: SegmentedOption<T>[];
	onChange: (value: T) => void;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"inline-flex flex-wrap gap-1 rounded-lg border border-border/50 bg-surface p-1",
				className,
			)}
			role="group"
		>
			{options.map((option) => {
				const active = option.value === value;
				return (
					<button
						key={option.value}
						type="button"
						disabled={option.disabled}
						className={cn(
							"rounded-md px-3 py-1.5 font-medium text-[13px] transition-colors duration-200",
							active
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground",
							option.disabled && "cursor-not-allowed opacity-50",
						)}
						onClick={() => onChange(option.value)}
					>
						{option.label}
					</button>
				);
			})}
		</div>
	);
}
