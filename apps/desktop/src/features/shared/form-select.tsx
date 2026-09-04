import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ProfileDock/ui/components/select";
import { cn } from "@ProfileDock/ui/lib/utils";

export interface FormSelectOption {
	value: string;
	label: string;
}

interface FormSelectProps {
	value: string;
	onValueChange: (value: string) => void;
	options: FormSelectOption[];
	placeholder?: string;
	className?: string;
	disabled?: boolean;
}

export function FormSelect({
	value,
	onValueChange,
	options,
	placeholder,
	className,
	disabled,
}: FormSelectProps) {
	return (
		<Select
			value={value}
			disabled={disabled}
			onValueChange={(next) => {
				if (next != null) onValueChange(next);
			}}
		>
			<SelectTrigger
				className={cn(
					"h-9 w-full rounded-md border border-input/80 bg-background px-3 text-sm shadow-none transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-input hover:bg-surface focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 data-[popup-open]:border-ring/60 data-[popup-open]:bg-background data-[popup-open]:ring-2 data-[popup-open]:ring-ring/20",
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
						className="rounded-md text-sm"
					>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
