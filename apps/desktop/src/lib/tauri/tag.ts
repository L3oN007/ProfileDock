import type { CreateTagInput, Tag } from "@/types/tag";

import { invokeCommand } from "./client";

export const tagApi = {
	list() {
		return invokeCommand<Tag[]>("tag_list");
	},

	create(input: CreateTagInput) {
		return invokeCommand<Tag>("tag_create", { input });
	},

	delete(id: string) {
		return invokeCommand<void>("tag_delete", { id });
	},
};
