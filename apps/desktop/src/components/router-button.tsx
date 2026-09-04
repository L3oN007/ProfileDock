import { Button } from "@ProfileDock/ui/components/button";
import { useNavigate } from "@tanstack/react-router";
import type { ComponentProps, MouseEvent } from "react";

type RouterButtonProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
	to: string;
	params?: Record<string, string>;
	search?: Record<string, unknown>;
	onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
};

export function RouterButton({
	to,
	params,
	search,
	onClick,
	...props
}: RouterButtonProps) {
	const navigate = useNavigate();

	return (
		<Button
			{...props}
			onClick={(event) => {
				onClick?.(event);
				if (!event.defaultPrevented) {
					void navigate({ to, params, search });
				}
			}}
		/>
	);
}
