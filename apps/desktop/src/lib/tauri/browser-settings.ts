import type {
	PreflightResult,
	ProfileBrowserSettings,
	UpdateBrowserSettingsInput,
} from "@/types/cloak";

import { invokeCommand } from "./client";

export const browserSettingsApi = {
	get(profileId: string) {
		return invokeCommand<ProfileBrowserSettings>(
			"profile_browser_settings_get",
			{
				profileId,
			},
		);
	},

	update(profileId: string, input: UpdateBrowserSettingsInput) {
		return invokeCommand<ProfileBrowserSettings>(
			"profile_browser_settings_update",
			{
				profileId,
				input,
			},
		);
	},

	preflight(profileId: string) {
		return invokeCommand<PreflightResult>("profile_preflight", { profileId });
	},
};
