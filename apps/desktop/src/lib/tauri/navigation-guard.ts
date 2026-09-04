import type { AnyRouter } from "@tanstack/react-router";

import { isTauriBuild } from "@/lib/tauri/is-tauri-build";
import { isDesktopRuntime } from "@/lib/tauri/runtime";

function isInternalAppPath(pathname: string): boolean {
	if (!pathname.startsWith("/")) {
		return false;
	}

	if (pathname.startsWith("/assets/")) {
		return false;
	}

	return !/\.[a-z0-9]+$/i.test(pathname);
}

export function initTauriNavigationGuard(getRouter: () => AnyRouter) {
	if (!isTauriBuild && !isDesktopRuntime()) {
		return;
	}

	document.addEventListener(
		"click",
		(event) => {
			if (event.defaultPrevented || event.button !== 0) {
				return;
			}

			if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
				return;
			}

			const target = event.target;
			if (!(target instanceof Element)) {
				return;
			}

			const anchor = target.closest("a[href]");
			if (!anchor || anchor.getAttribute("target") === "_blank") {
				return;
			}

			const href = anchor.getAttribute("href");
			if (
				!href ||
				href.startsWith("#") ||
				href.startsWith("mailto:") ||
				href.startsWith("tel:")
			) {
				return;
			}

			let url: URL;
			try {
				url = new URL(href, window.location.href);
			} catch {
				return;
			}

			event.preventDefault();
			event.stopImmediatePropagation();

			if (url.origin !== window.location.origin) {
				return;
			}

			if (!isInternalAppPath(url.pathname)) {
				return;
			}

			const destination = `${url.pathname}${url.search}${url.hash}`;
			const router = getRouter();
			const current = `${router.state.location.pathname}${router.state.location.search}${router.state.location.hash}`;

			if (current !== destination) {
				void router.navigate({ to: destination });
			}
		},
		true,
	);
}
