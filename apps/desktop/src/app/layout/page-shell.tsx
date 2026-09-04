import { cn } from "@ProfileDock/ui/lib/utils";

import { notion } from "@/app/design/system";

export function PageShell({
	children,
	className,
	fullBleed = false,
}: {
	children: React.ReactNode;
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
	actions?: React.ReactNode;
}) {
	return (
		<div className="flex flex-wrap items-start justify-between gap-4 pb-2">
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
			{actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
		</div>
	);
}
