import { createFileRoute } from "@tanstack/react-router";

import { PlaceholderPage } from "@/features/shared/placeholder-page";

export const Route = createFileRoute("/_app/profiles")({
	component: () => (
		<PlaceholderPage
			title="Profiles"
			description="Profile management coming in Phase 1."
		/>
	),
});
