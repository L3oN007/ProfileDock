import { cn } from "@ProfileDock/ui/lib/utils";
import { X } from "lucide-react";

import {
	getTagColorStyle,
	TAG_BADGE_BASE,
} from "@/features/tags/lib/tag-colors";

interface TagBadgeProps {
	name: string;
	color: string;
	onRemove?: () => void;
	className?: string;
}

export function TagBadge({ name, color, onRemove, className }: TagBadgeProps) {
	const style = getTagColorStyle(color);

	return (
		<span
			className={cn(
				TAG_BADGE_BASE,
				style.border,
				style.bg,
				style.text,
				className,
			)}
		>
			<span className="truncate leading-none">{name}</span>
			{onRemove ? (
				<button
					type="button"
					className="-mr-0.5 rounded-sm p-0.5 opacity-60 transition-opacity hover:opacity-100"
					onClick={onRemove}
					aria-label={`Remove ${name}`}
				>
					<X className="size-2.5" />
				</button>
			) : null}
		</span>
	);
}

interface TagBadgeListProps {
	tags: Array<{ id?: string; name: string; color: string }>;
	onRemove?: (tag: { id?: string; name: string; color: string }) => void;
	className?: string;
	emptyLabel?: string;
}

export function TagBadgeList({
	tags,
	onRemove,
	className,
	emptyLabel = "—",
}: TagBadgeListProps) {
	if (tags.length === 0) {
		return <span className="text-muted-foreground text-xs">{emptyLabel}</span>;
	}

	return (
		<div className={cn("flex flex-wrap gap-1", className)}>
			{tags.map((tag) => (
				<TagBadge
					key={tag.id ?? tag.name}
					name={tag.name}
					color={tag.color}
					onRemove={onRemove ? () => onRemove(tag) : undefined}
				/>
			))}
		</div>
	);
}
