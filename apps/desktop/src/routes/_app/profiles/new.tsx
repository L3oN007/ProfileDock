import { createFileRoute } from "@tanstack/react-router";

import { NewProfilePage } from "@/features/profiles/pages/new-profile-page";

export const Route = createFileRoute("/_app/profiles/new")({
	component: NewProfilePage,
});
