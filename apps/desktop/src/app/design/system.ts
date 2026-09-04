export const notion = {
	shell: "flex h-svh bg-background text-foreground",
	sidebar:
		"flex w-[240px] shrink-0 flex-col border-border border-r bg-sidebar text-sidebar-foreground",
	sidebarSection:
		"px-2 py-1.5 font-medium text-[11px] text-muted-foreground tracking-wide",
	navItem:
		"flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-accent hover:text-foreground [&.active]:bg-accent [&.active]:font-medium [&.active]:text-foreground",
	main: "flex min-w-0 flex-1 flex-col overflow-hidden bg-background",
	header:
		"flex h-11 shrink-0 items-center justify-between border-border border-b bg-background/80 px-5 backdrop-blur-sm",
	page: "flex-1 overflow-auto px-6 py-8 md:px-10 md:py-10",
	pageInner: "mx-auto flex w-full max-w-6xl flex-col gap-6",
	panel:
		"rounded-lg border border-border bg-card text-card-foreground shadow-[0_1px_2px_rgba(15,15,15,0.04)]",
	panelInset: "rounded-md border border-border bg-muted/40",
	input:
		"h-8 rounded-md border border-input bg-background px-3 text-sm shadow-none transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring",
	select:
		"h-8 rounded-md border border-input bg-background px-2.5 text-sm shadow-none transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
	textarea:
		"min-h-28 w-full rounded-md border border-input bg-background p-3 text-sm shadow-none transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
	tableWrap: "overflow-hidden rounded-lg border border-border bg-card",
	tableHead: "border-border bg-muted/30 text-muted-foreground text-xs font-medium",
	tableRow:
		"border-border transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-accent/60",
	tag: "rounded-md bg-muted px-2 py-0.5 text-foreground text-xs",
	ghostBtn: "border-border bg-transparent",
	primaryBtn: "bg-primary text-primary-foreground hover:bg-primary/90",
} as const;
