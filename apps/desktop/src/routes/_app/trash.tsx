import { createFileRoute } from "@tanstack/react-router";

import { TrashPage } from "@/features/trash/pages/trash-page";

export const Route = createFileRoute("/_app/trash")({
	component: TrashPage,
});
