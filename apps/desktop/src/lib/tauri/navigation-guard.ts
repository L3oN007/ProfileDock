import type { AnyRouter } from "@tanstack/react-router";

import { isDesktopRuntime } from "@/lib/tauri/runtime";

export function initTauriNavigationGuard(getRouter: () => AnyRouter) {
	document.addEventListener(
		"click",
		(event) => {
			if (!isDesktopRuntime()) {
				return;
			}

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

			if (url.origin !== window.location.origin) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();

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
