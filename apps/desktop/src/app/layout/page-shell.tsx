import { cn } from "@ProfileDock/ui/lib/utils";

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
		<div className={cn("flex-1 overflow-auto px-4 py-5 sm:px-6", className)}>
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
				{children}
			</div>
		</div>
	);
}

export const panelClassName =
	"border-[#252a36] bg-[#161b26] text-[#eef1f6] shadow-none";
