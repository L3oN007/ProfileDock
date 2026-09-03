import { createFileRoute } from "@tanstack/react-router";

import { BrowsersPage } from "@/features/browsers/browsers-page";

export const Route = createFileRoute("/_app/browsers")({
	component: BrowsersPage,
});
