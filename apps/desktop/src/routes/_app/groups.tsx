import { createFileRoute } from "@tanstack/react-router";

import { GroupsPage } from "@/features/groups/pages/groups-page";

export const Route = createFileRoute("/_app/groups")({
	component: GroupsPage,
});
