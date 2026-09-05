import type { CreateTagInput, Tag, UpdateTagInput } from "@/types/tag";

import { invokeCommand } from "./client";

export const tagApi = {
	list() {
		return invokeCommand<Tag[]>("tag_list");
	},

	create(input: CreateTagInput) {
		return invokeCommand<Tag>("tag_create", {
			input: {
				name: input.name,
				color: input.color,
			},
		});
	},

	delete(id: string) {
		return invokeCommand<void>("tag_delete", { id });
	},

	update(id: string, input: UpdateTagInput) {
		return invokeCommand<Tag>("tag_update", {
			id,
			input: {
				color: input.color,
			},
		});
	},
};
