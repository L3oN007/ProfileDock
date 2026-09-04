import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ProfilesPage } from "@/features/profiles/pages/profiles-page";

const profilesSearchSchema = z.object({
	groupId: z.string().optional(),
	tagId: z.string().optional(),
});

export const Route = createFileRoute("/_app/profiles/")({
	validateSearch: profilesSearchSchema,
	component: ProfilesPage,
});
