import type {
	BrowserInstance,
	CreateProfileInput,
	Profile,
	ProfileEvent,
	UpdateProfileInput,
} from "@/types/profile";

import { invokeCommand } from "./client";

export const profileApi = {
	list(search?: string) {
		return invokeCommand<Profile[]>("profile_list", { search });
	},

	get(id: string) {
		return invokeCommand<Profile>("profile_get", { id });
	},

	create(input: CreateProfileInput) {
		return invokeCommand<Profile>("profile_create", { input });
	},

	update(id: string, input: UpdateProfileInput) {
		return invokeCommand<Profile>("profile_update", { id, input });
	},

	archive(id: string) {
		return invokeCommand<void>("profile_archive", { id });
	},

	launch(id: string) {
		return invokeCommand<BrowserInstance>("profile_launch", { id });
	},

	stop(id: string) {
		return invokeCommand<void>("profile_stop", { id });
	},

	getInstance(id: string) {
		return invokeCommand<BrowserInstance | null>("profile_get_instance", {
			id,
		});
	},

	listEvents(id: string) {
		return invokeCommand<ProfileEvent[]>("profile_list_events", { id });
	},
};
