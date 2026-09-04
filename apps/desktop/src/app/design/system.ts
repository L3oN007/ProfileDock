export const notion = {
	shell: "flex h-svh bg-background text-foreground",
	sidebar:
		"flex w-[240px] shrink-0 flex-col border-border border-r bg-sidebar text-sidebar-foreground",
	sidebarSection:
		"px-2 py-1.5 font-medium text-[11px] text-muted-foreground tracking-wide",
	navItem:
		"flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] text-muted-foreground transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
	main: "flex min-w-0 flex-1 flex-col overflow-hidden bg-background",
	header:
		"flex h-11 shrink-0 items-center justify-between border-border border-b bg-background/80 px-5 backdrop-blur-sm",
	page: "flex min-h-0 flex-1 flex-col overflow-auto px-6 py-8 md:px-10 md:py-10",
	pageInner: "mx-auto flex w-full max-w-6xl flex-col gap-6",
	panel:
		"rounded-xl border border-border bg-card text-card-foreground shadow-[0_1px_2px_rgba(15,15,15,0.04)]",
	surface: "rounded-xl border border-border/50 bg-surface",
	surfaceInset: "rounded-lg border border-border/50 bg-surface-inset",
	tabBar: "border-border/60 border-b",
	tabList: "flex flex-wrap gap-6 -mb-px",
	tabItem:
		"relative pb-3 font-medium text-[13px] text-muted-foreground transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-foreground",
	tabItemActive:
		"text-primary after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary",
	statTile:
		"rounded-xl border border-border bg-card px-5 py-4 shadow-[0_1px_2px_rgba(15,15,15,0.03)]",
	statsBar:
		"overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(15,15,15,0.03)]",
	statsBarGrid:
		"grid grid-cols-1 divide-border/60 divide-y sm:divide-y-0 sm:divide-x",
	statsBarItem: "px-5 py-4",
	fieldLabel: "font-medium text-[13px] text-foreground",
	fieldHint: "text-muted-foreground text-xs leading-relaxed",
	panelInset: "rounded-lg border border-border bg-surface-inset",
	input:
		"h-8 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
	select:
		"h-8 rounded-md border border-input bg-background px-2.5 text-sm shadow-sm outline-none transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
	textarea:
		"min-h-28 w-full rounded-md border border-input bg-background p-3 text-sm shadow-sm outline-none transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50",
	tableWrap: "overflow-hidden rounded-lg",
	tableHead:
		"border-border bg-surface text-muted-foreground text-xs font-medium",
	tableRow:
		"border-border transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-accent/50",
	listRow:
		"flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors duration-200 hover:bg-surface",
	tag: "rounded-md border border-border/70 bg-surface px-2 py-0.5 text-foreground text-xs",
	ghostBtn: "border-border bg-transparent",
	primaryBtn: "bg-primary text-primary-foreground hover:bg-primary/90",
} as const;
