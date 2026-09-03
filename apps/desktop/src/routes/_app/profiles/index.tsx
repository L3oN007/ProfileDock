import { createFileRoute } from "@tanstack/react-router";

import { ProfilesPage } from "@/features/profiles/pages/profiles-page";

export const Route = createFileRoute("/_app/profiles/")({
	component: ProfilesPage,
});
