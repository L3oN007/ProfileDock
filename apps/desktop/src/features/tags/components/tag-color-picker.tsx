import { cn } from "@ProfileDock/ui/lib/utils";

import {
	DEFAULT_TAG_COLOR,
	TAG_COLORS,
	type TagColorId,
} from "@/features/tags/lib/tag-colors";

interface TagColorPickerProps {
	value: TagColorId;
	onChange: (color: TagColorId) => void;
	className?: string;
}

export function TagColorPicker({
	value,
	onChange,
	className,
}: TagColorPickerProps) {
	return (
		<div className={cn("flex flex-wrap gap-1.5", className)}>
			{TAG_COLORS.map((color) => (
				<button
					key={color.id}
					type="button"
					className={cn(
						"size-5 rounded-full border-2 transition-transform hover:scale-110",
						color.dot,
						value === color.id
							? "border-foreground/70 ring-2 ring-foreground/20"
							: "border-transparent",
					)}
					aria-label={color.label}
					title={color.label}
					onClick={() => onChange(color.id)}
				/>
			))}
		</div>
	);
}

export function TagColorDot({ color }: { color: string }) {
	const style = TAG_COLORS.find((item) => item.id === color) ?? TAG_COLORS[0];
	return (
		<span
			className={cn("size-2.5 shrink-0 rounded-full", style.dot)}
			aria-hidden
		/>
	);
}

export { DEFAULT_TAG_COLOR };
