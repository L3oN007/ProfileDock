import { cn } from "@ProfileDock/ui/lib/utils";
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { notion } from "@/app/design/system";
import { TagBadge } from "@/features/tags/components/tag-badge";
import {
	DEFAULT_TAG_COLOR,
	TagColorPicker,
} from "@/features/tags/components/tag-color-picker";
import {
	nextTagColor,
	type TagColorId,
} from "@/features/tags/lib/tag-colors";
import { useTags } from "@/features/tags/api/queries";
import type { Tag } from "@/types/tag";
import type { TagAssignment } from "@/types/tag";

export interface SelectedTag extends TagAssignment {
	id?: string;
}

interface TagPickerProps {
	value: SelectedTag[];
	onChange: (tags: SelectedTag[]) => void;
	placeholder?: string;
	className?: string;
}

function toSelectedTag(tag: Tag): SelectedTag {
	return {
		id: tag.id,
		name: tag.name,
		color: tag.color,
	};
}

function tagKey(tag: SelectedTag) {
	return tag.id ?? tag.name.toLowerCase();
}

export function TagPicker({
	value,
	onChange,
	placeholder = "Search or create a tag…",
	className,
}: TagPickerProps) {
	const tagsQuery = useTags();
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const [createColor, setCreateColor] = useState<TagColorId>(DEFAULT_TAG_COLOR);
	const containerRef = useRef<HTMLDivElement>(null);

	const allTags = tagsQuery.data ?? [];
	const selectedKeys = new Set(value.map(tagKey));

	const filteredTags = useMemo(() => {
		const normalized = query.trim().toLowerCase();
		return allTags.filter((tag) => {
			if (selectedKeys.has(tag.id)) return false;
			if (!normalized) return true;
			return tag.name.toLowerCase().includes(normalized);
		});
	}, [allTags, query, selectedKeys]);

	const trimmedQuery = query.trim();
	const exactMatch = allTags.some(
		(tag) => tag.name.toLowerCase() === trimmedQuery.toLowerCase(),
	);
	const canCreate =
		trimmedQuery.length > 0 &&
		!exactMatch &&
		!value.some(
			(tag) => tag.name.toLowerCase() === trimmedQuery.toLowerCase(),
		);

	useEffect(() => {
		if (!open) return;
		setCreateColor(
			nextTagColor([
				...value.map((tag) => tag.color),
				...allTags.map((tag) => tag.color),
			]),
		);
	}, [open, trimmedQuery, value, allTags]);

	useEffect(() => {
		const handlePointerDown = (event: MouseEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", handlePointerDown);
		return () => document.removeEventListener("mousedown", handlePointerDown);
	}, []);

	const addTag = (tag: SelectedTag) => {
		onChange([...value, tag]);
		setQuery("");
		setOpen(false);
	};

	const removeTag = (tag: SelectedTag) => {
		onChange(value.filter((item) => tagKey(item) !== tagKey(tag)));
	};

	const handleCreate = () => {
		if (!canCreate) return;
		addTag({
			name: trimmedQuery,
			color: createColor,
		});
	};

	const handleSelectExisting = (tag: Tag) => {
		addTag(toSelectedTag(tag));
	};

	return (
		<div ref={containerRef} className={cn("relative space-y-2", className)}>
			<div
				className={cn(
					notion.input,
					"flex min-h-9 flex-wrap items-center gap-1.5 px-2 py-1.5",
				)}
			>
				{value.map((tag) => (
					<TagBadge
						key={tagKey(tag)}
						name={tag.name}
						color={tag.color}
						onRemove={() => removeTag(tag)}
					/>
				))}
				<div className="relative min-w-[8rem] flex-1">
					<Search className="pointer-events-none absolute top-1/2 left-0 size-3.5 -translate-y-1/2 text-muted-foreground" />
					<input
						type="text"
						value={query}
						onChange={(event) => {
							setQuery(event.target.value);
							setOpen(true);
						}}
						onFocus={() => setOpen(true)}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault();
								if (filteredTags.length > 0 && !canCreate) {
									handleSelectExisting(filteredTags[0]);
									return;
								}
								handleCreate();
							}
							if (event.key === "Backspace" && !query && value.length > 0) {
								removeTag(value[value.length - 1]);
							}
						}}
						placeholder={value.length === 0 ? placeholder : ""}
						className="w-full bg-transparent py-0.5 pl-5 text-sm outline-none"
					/>
				</div>
			</div>

			{open && (filteredTags.length > 0 || canCreate) ? (
				<div
					className="absolute top-full z-50 mt-1 w-full overflow-hidden rounded-lg border border-border/60 bg-popover shadow-md"
				>
					<div className="max-h-52 overflow-y-auto py-1">
						{filteredTags.map((tag) => (
							<button
								key={tag.id}
								type="button"
								className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
								onMouseDown={(event) => event.preventDefault()}
								onClick={() => handleSelectExisting(tag)}
							>
								<TagBadge name={tag.name} color={tag.color} />
							</button>
						))}
					</div>

					{canCreate ? (
						<div className="border-border/60 border-t px-3 py-2.5">
							<button
								type="button"
								className="flex w-full items-center gap-2 text-left text-sm transition-colors hover:text-primary"
								onMouseDown={(event) => event.preventDefault()}
								onClick={handleCreate}
							>
								<Plus className="size-3.5" />
								<span>
									Create tag <strong>{trimmedQuery}</strong>
								</span>
							</button>
							<div className="mt-2.5">
								<p className="mb-1.5 text-muted-foreground text-xs">
									Pick a color
								</p>
								<TagColorPicker
									value={createColor}
									onChange={setCreateColor}
								/>
							</div>
						</div>
					) : null}
				</div>
			) : null}
		</div>
	);
}
