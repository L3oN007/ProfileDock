import { createFileRoute } from "@tanstack/react-router";

import { ActivityPage } from "@/features/activity/pages/activity-page";

export const Route = createFileRoute("/_app/activity")({
	component: ActivityPage,
});
