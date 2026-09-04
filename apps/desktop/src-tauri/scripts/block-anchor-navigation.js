// Runs before the frontend bundle to stop WebView2 from handing anchor clicks
// to the system browser on Windows.
(function () {
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

			event.preventDefault();
			event.stopImmediatePropagation();
		},
		true,
	);
})();
