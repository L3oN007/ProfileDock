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
					"h-8 min-w-[128px] rounded-md border border-transparent bg-muted/60 px-2.5 text-[13px] text-foreground shadow-none transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-muted focus-visible:border-input focus-visible:ring-1 focus-visible:ring-ring/40 data-[popup-open]:border-input data-[popup-open]:bg-background",
					className,
				)}
			>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent className="rounded-md border border-border bg-popover shadow-md">
				{options.map((option) => (
					<SelectItem
						key={option.value}
						value={option.value}
						className="rounded-sm text-[13px]"
					>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
