import { cn } from "@ProfileDock/ui/lib/utils";
import { Link, useMatchRoute, useNavigate } from "@tanstack/react-router";
import type { MouseEvent, ReactNode } from "react";

import { isDesktopRuntime } from "@/lib/tauri/runtime";

const inlineReset =
	"inline cursor-pointer appearance-none border-0 bg-transparent p-0 shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

const navReset =
	"flex w-full shrink-0 cursor-pointer appearance-none border-0 bg-transparent p-0 text-left shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring/30";

type RouterLinkProps = {
	to: string;
	params?: Record<string, string>;
	search?: Record<string, unknown>;
	className?: string;
	activeProps?: { className?: string };
	variant?: "inline" | "nav";
	children: ReactNode;
	onClick?: (event: MouseEvent<HTMLElement>) => void;
};

export function RouterLink({
	to,
	params,
	search,
	className,
	activeProps,
	variant = "inline",
	children,
	onClick,
}: RouterLinkProps) {
	const navigate = useNavigate();
	const matchRoute = useMatchRoute();
	const isActive = Boolean(matchRoute({ to, params, search, fuzzy: false }));
	const mergedClassName = cn(
		isDesktopRuntime() && (variant === "nav" ? navReset : inlineReset),
		className,
		isActive && activeProps?.className,
	);

	const handleNavigate = (event: MouseEvent<HTMLElement>) => {
		onClick?.(event);
		if (!event.defaultPrevented) {
			void navigate({ to, params, search });
		}
	};

	if (isDesktopRuntime()) {
		return (
			<button type="button" className={mergedClassName} onClick={handleNavigate}>
				{children}
			</button>
		);
	}

	return (
		<Link
			to={to}
			params={params}
			search={search}
			className={className}
			activeProps={activeProps}
			onClick={onClick}
		>
			{children}
		</Link>
	);
}
