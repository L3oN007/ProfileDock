import type {
	CreateGroupInput,
	ProfileGroup,
	UpdateGroupInput,
} from "@/types/group";

import { invokeCommand } from "./client";

export const groupApi = {
	list() {
		return invokeCommand<ProfileGroup[]>("group_list");
	},

	create(input: CreateGroupInput) {
		return invokeCommand<ProfileGroup>("group_create", { input });
	},

	update(id: string, input: UpdateGroupInput) {
		return invokeCommand<ProfileGroup>("group_update", { id, input });
	},

	delete(id: string) {
		return invokeCommand<void>("group_delete", { id });
	},
};
