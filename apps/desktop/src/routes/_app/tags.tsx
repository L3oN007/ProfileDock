import { createFileRoute } from "@tanstack/react-router";

import { TagsPage } from "@/features/tags/pages/tags-page";

export const Route = createFileRoute("/_app/tags")({
	component: TagsPage,
});
