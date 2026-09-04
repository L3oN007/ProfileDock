import { isDesktopRuntime } from "@/lib/tauri/runtime";

export function initTauriNavigationGuard() {
	if (!isDesktopRuntime()) {
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

			if (url.origin !== window.location.origin) {
				return;
			}

			// Block full-page navigation in the Tauri webview. React router handlers
			// still run and perform client-side navigation.
			event.preventDefault();
		},
		true,
	);
}
