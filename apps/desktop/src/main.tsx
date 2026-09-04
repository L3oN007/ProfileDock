import { createRouter, RouterProvider } from "@tanstack/react-router";
import { isTauri } from "@tauri-apps/api/core";
import ReactDOM from "react-dom/client";

import Loader from "./components/loader";
import { isTauriBuild } from "./lib/tauri/is-tauri-build";
import { initTauriNavigationGuard } from "./lib/tauri/navigation-guard";
import { routeTree } from "./routeTree.gen";

const router = createRouter({
	routeTree,
	defaultPreload: isTauriBuild || isTauri() ? false : "intent",
	scrollRestoration: true,
	defaultPendingComponent: () => <Loader />,
	context: {},
});

initTauriNavigationGuard(() => router);

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("app");

if (!rootElement) {
	throw new Error("Root element not found");
}

if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(<RouterProvider router={router} />);
}
