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
				<div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
			) : null}
		</div>
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
		<section className={cn(notion.panel, "overflow-hidden", className)}>
			{title ? (
				<div className="flex flex-wrap items-start justify-between gap-3 border-border border-b px-5 py-4">
					<div className="min-w-0 space-y-0.5">
						<h2 className="font-medium text-base text-foreground">{title}</h2>
						{description ? (
							<p className="text-muted-foreground text-sm">{description}</p>
						) : null}
					</div>
					{actions ? (
						<div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
					) : null}
				</div>
			) : null}
			<div className={cn("px-5 py-4", contentClassName)}>{children}</div>
		</section>
	);
}

export function ListRow({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn(notion.listRow, className)}>{children}</div>
	);
}

export function EmptyState({
	title,
	description,
}: {
	title: string;
	description?: string;
}) {
	return (
		<div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-10 text-center">
			<p className="font-medium text-foreground text-sm">{title}</p>
			{description ? (
				<p className="mt-1 text-muted-foreground text-sm">{description}</p>
			) : null}
		</div>
	);
}
