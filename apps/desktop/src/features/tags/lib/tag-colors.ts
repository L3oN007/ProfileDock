/** Shared base classes — matches `Badge` in @ProfileDock/ui */
export const TAG_BADGE_BASE =
	"inline-flex h-5 w-fit max-w-full shrink-0 items-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap";

/**
 * Notion-inspired tag palette using the same color-mix pattern as status badges.
 * Accent hex values align with Notion's default tag colors.
 */
export const TAG_COLORS = [
	{
		id: "gray",
		label: "Gray",
		border: "border-[color-mix(in_oklab,#787774_28%,transparent)]",
		bg: "bg-[color-mix(in_oklab,#787774_12%,transparent)]",
		text: "text-[#5f5e5b] dark:text-[#ababa8]",
		dot: "bg-[#787774]",
	},
	{
		id: "brown",
		label: "Brown",
		border: "border-[color-mix(in_oklab,#9f6b53_28%,transparent)]",
		bg: "bg-[color-mix(in_oklab,#9f6b53_12%,transparent)]",
		text: "text-[#8f5c42] dark:text-[#d4a88a]",
		dot: "bg-[#9f6b53]",
	},
	{
		id: "orange",
		label: "Orange",
		border: "border-[color-mix(in_oklab,#d9730d_28%,transparent)]",
		bg: "bg-[color-mix(in_oklab,#d9730d_12%,transparent)]",
		text: "text-[#b45309] dark:text-[#f0b35c]",
		dot: "bg-[#d9730d]",
	},
	{
		id: "yellow",
		label: "Yellow",
		border: "border-[color-mix(in_oklab,#cb9131_28%,transparent)]",
		bg: "bg-[color-mix(in_oklab,#cb9131_12%,transparent)]",
		text: "text-[#9a6f1f] dark:text-[#e8c468]",
		dot: "bg-[#cb9131]",
	},
	{
		id: "green",
		label: "Green",
		border: "border-[color-mix(in_oklab,#448361_28%,transparent)]",
		bg: "bg-[color-mix(in_oklab,#448361_12%,transparent)]",
		text: "text-[#2f6b4d] dark:text-[#7ec9a0]",
		dot: "bg-[#448361]",
	},
	{
		id: "blue",
		label: "Blue",
		border: "border-[color-mix(in_oklab,#2783de_28%,transparent)]",
		bg: "bg-[color-mix(in_oklab,#2783de_12%,transparent)]",
		text: "text-[#1a6fc9] dark:text-[#6eb3f7]",
		dot: "bg-[#2783de]",
	},
	{
		id: "purple",
		label: "Purple",
		border: "border-[color-mix(in_oklab,#9065b0_28%,transparent)]",
		bg: "bg-[color-mix(in_oklab,#9065b0_12%,transparent)]",
		text: "text-[#754d91] dark:text-[#c4a3d9]",
		dot: "bg-[#9065b0]",
	},
	{
		id: "pink",
		label: "Pink",
		border: "border-[color-mix(in_oklab,#c14d8a_28%,transparent)]",
		bg: "bg-[color-mix(in_oklab,#c14d8a_12%,transparent)]",
		text: "text-[#a33d73] dark:text-[#e89fc4]",
		dot: "bg-[#c14d8a]",
	},
	{
		id: "red",
		label: "Red",
		border: "border-[color-mix(in_oklab,#d44c47_28%,transparent)]",
		bg: "bg-[color-mix(in_oklab,#d44c47_12%,transparent)]",
		text: "text-[#b83d39] dark:text-[#f08a86]",
		dot: "bg-[#d44c47]",
	},
] as const;

export type TagColorId = (typeof TAG_COLORS)[number]["id"];

export const DEFAULT_TAG_COLOR: TagColorId = "gray";

export function getTagColorStyle(colorId: string) {
	return (
		TAG_COLORS.find((color) => color.id === colorId) ??
		TAG_COLORS.find((color) => color.id === DEFAULT_TAG_COLOR)!
	);
}

export function isTagColorId(value: string): value is TagColorId {
	return TAG_COLORS.some((color) => color.id === value);
}

export function nextTagColor(existing: string[]): TagColorId {
	const used = new Set(existing);
	const available = TAG_COLORS.find((color) => !used.has(color.id));
	return available?.id ?? DEFAULT_TAG_COLOR;
}
