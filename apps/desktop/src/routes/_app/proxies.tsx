import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/features/shared/placeholder-page";

export const Route = createFileRoute("/_app/proxies")({
	component: () => (
		<PlaceholderPage
			title="Proxies"
			description="Proxy management coming in Phase 2."
		/>
	),
});
