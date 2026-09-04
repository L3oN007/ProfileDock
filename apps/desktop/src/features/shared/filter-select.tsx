import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ProfileDock/ui/components/select";
import { cn } from "@ProfileDock/ui/lib/utils";

export interface FilterSelectOption {
	value: string;
	label: string;
}

interface FilterSelectProps {
	value: string;
	onValueChange: (value: string) => void;
	options: FilterSelectOption[];
	placeholder?: string;
	className?: string;
}

export function FilterSelect({
	value,
	onValueChange,
	options,
	placeholder,
	className,
}: FilterSelectProps) {
	return (
		<Select
			value={value}
			onValueChange={(next) => {
				if (next != null) onValueChange(next);
			}}
		>
			<SelectTrigger
				size="sm"
				className={cn(
					"h-8 min-w-[128px] rounded-md border border-border/70 bg-surface px-2.5 text-[13px] text-foreground shadow-sm transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-border hover:bg-surface-inset focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 data-[popup-open]:border-ring/60 data-[popup-open]:bg-background data-[popup-open]:ring-2 data-[popup-open]:ring-ring/20",
					className,
				)}
			>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent className="rounded-lg border border-border/80 bg-popover p-1 shadow-lg">
				{options.map((option) => (
					<SelectItem
						key={option.value}
						value={option.value}
						className="rounded-md text-[13px]"
					>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
