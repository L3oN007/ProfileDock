import { cn } from "@ProfileDock/ui/lib/utils";
import type { ReactNode } from "react";

import { notion } from "@/app/design/system";

export function PageShell({
	children,
	className,
	fullBleed = false,
}: {
	children: ReactNode;
	className?: string;
	fullBleed?: boolean;
}) {
	if (fullBleed) {
		return (
			<div className={cn("flex min-h-0 flex-1 flex-col", className)}>
				{children}
			</div>
		);
	}

	return (
		<div className={cn(notion.page, className)}>
			<div className={notion.pageInner}>{children}</div>
		</div>
	);
}

/** @deprecated Prefer SectionBlock or ContentSection for borderless layouts */
export const panelClassName = notion.panel;

export function PageTitle({
	title,
	description,
	actions,
}: {
	title: string;
	description?: string;
	actions?: ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-start justify-between gap-4 pb-4">
			<div className="min-w-0 space-y-1">
				<h1 className="font-semibold text-2xl text-foreground tracking-tight">
					{title}
				</h1>
				{description ? (
					<p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
						{description}
					</p>
				) : null}
			</div>
			{actions ? (
				<div className="flex shrink-0 flex-wrap items-center gap-2">
					{actions}
				</div>
			) : null}
		</div>
	);
}

export function PageTabs({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn(notion.tabBar, className)}>
			<div className={notion.tabList}>{children}</div>
		</div>
	);
}

export function PageTab({
	active,
	children,
	onClick,
}: {
	active: boolean;
	children: ReactNode;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			className={cn(notion.tabItem, active && notion.tabItemActive)}
			onClick={onClick}
		>
			{children}
		</button>
	);
}

export function SectionBlock({
	title,
	description,
	actions,
	children,
	className,
	inset = false,
}: {
	title?: string;
	description?: string;
	actions?: ReactNode;
	children: ReactNode;
	className?: string;
	inset?: boolean;
}) {
	return (
		<section
			className={cn(
				"space-y-4",
				inset && cn(notion.surface, "px-5 py-5"),
				className,
			)}
		>
			{title ? (
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="min-w-0 space-y-0.5">
						<h2 className="font-medium text-base text-foreground">{title}</h2>
						{description ? (
							<p className="text-muted-foreground text-sm">{description}</p>
						) : null}
					</div>
					{actions ? (
						<div className="flex shrink-0 flex-wrap items-center gap-2">
							{actions}
						</div>
					) : null}
				</div>
			) : null}
			{children}
		</section>
	);
}

export function ContentSection({
	title,
	description,
	actions,
	children,
	className,
	contentClassName,
}: {
	title?: string;
	description?: string;
	actions?: ReactNode;
	children: ReactNode;
	className?: string;
	contentClassName?: string;
}) {
	return (
		<SectionBlock
			title={title}
			description={description}
			actions={actions}
			className={className}
		>
			<div className={contentClassName}>{children}</div>
		</SectionBlock>
	);
}

export function ListRow({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return <div className={cn(notion.listRow, className)}>{children}</div>;
}

export function EmptyState({
	title,
	description,
}: {
	title: string;
	description?: string;
}) {
	return (
		<div className="rounded-lg border border-border/60 bg-surface px-6 py-10 text-center">
			<p className="font-medium text-foreground text-sm">{title}</p>
			{description ? (
				<p className="mt-1 text-muted-foreground text-sm">{description}</p>
			) : null}
		</div>
	);
}

export function DetailRow({
	label,
	value,
	className,
}: {
	label: string;
	value: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex items-start justify-between gap-4 border-border/50 border-b py-3 text-sm last:border-0",
				className,
			)}
		>
			<span className="shrink-0 text-muted-foreground">{label}</span>
			<span className="min-w-0 text-right text-foreground">{value}</span>
		</div>
	);
}

export function StatsBar({
	children,
	columns = 3,
	className,
}: {
	children: ReactNode;
	columns?: 2 | 3 | 4;
	className?: string;
}) {
	const columnClass =
		columns === 2
			? "sm:grid-cols-2"
			: columns === 4
				? "sm:grid-cols-2 xl:grid-cols-4"
				: "sm:grid-cols-3";

	return (
		<div className={cn(notion.statsBar, className)}>
			<div className={cn(notion.statsBarGrid, columnClass)}>{children}</div>
		</div>
	);
}

export function StatTile({
	label,
	value,
	tone = "default",
	variant = "card",
	className,
}: {
	label: string;
	value: ReactNode;
	tone?: "default" | "warning" | "primary";
	variant?: "card" | "segment";
	className?: string;
}) {
	const valueClass =
		tone === "warning"
			? "text-amber-600 dark:text-amber-400"
			: tone === "primary"
				? "text-primary"
				: "text-foreground";

	const isPrimitive = typeof value === "string" || typeof value === "number";

	return (
		<div
			className={cn(
				variant === "segment" ? notion.statsBarItem : notion.statTile,
				className,
			)}
		>
			<p className="font-medium text-[11px] text-muted-foreground uppercase tracking-wide">
				{label}
			</p>
			{isPrimitive ? (
				<p
					className={cn(
						"mt-1.5 font-semibold text-2xl tracking-tight",
						valueClass,
					)}
				>
					{value}
				</p>
			) : (
				<div className="mt-1.5">{value}</div>
			)}
		</div>
	);
}
