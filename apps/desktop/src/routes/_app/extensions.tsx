import { createFileRoute } from "@tanstack/react-router";

import { ExtensionsPage } from "@/features/extensions/pages/extensions-page";

export const Route = createFileRoute("/_app/extensions")({
	component: ExtensionsPage,
});
