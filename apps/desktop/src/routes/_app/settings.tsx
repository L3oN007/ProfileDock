import { createFileRoute } from "@tanstack/react-router";

import { BrowserSettingsPage } from "@/features/settings/browser-settings-page";

export const Route = createFileRoute("/_app/settings")({
	component: BrowserSettingsPage,
});
