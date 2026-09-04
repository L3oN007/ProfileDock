import { useEffect, type RefObject } from "react";
import { useNavigate } from "@tanstack/react-router";

export function useProfileListKeyboard(searchRef: RefObject<HTMLInputElement | null>) {
	const navigate = useNavigate();

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const isMeta = event.metaKey || event.ctrlKey;
			if (isMeta && event.key.toLowerCase() === "n") {
				event.preventDefault();
				navigate({ to: "/profiles/new" });
				return;
			}
			if (isMeta && event.key.toLowerCase() === "f") {
				event.preventDefault();
				searchRef.current?.focus();
			}
		};

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [navigate, searchRef]);
}
