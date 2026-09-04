import type {
	ActivityEvent,
	BulkProfileUpdateInput,
	BrowserInstance,
	CreateProfileFullInput,
	CreateProfileInput,
	Profile,
	ProfileEvent,
	ProfileListPage,
	ProfileListQuery,
	UpdateProfileInput,
} from "@/types/profile";

import { invokeCommand } from "./client";

function toListQuery(query: ProfileListQuery) {
	return {
		search: query.search,
		group_id: query.groupId,
		tag_ids: query.tagIds,
		status: query.status,
		proxy_id: query.proxyId,
		sort: query.sort,
		page: query.page,
		page_size: query.pageSize,
		include_archived: query.includeArchived,
	};
}

function toCreateFullInput(input: CreateProfileFullInput) {
	return {
		name: input.name,
		description: input.description,
		group_id: input.groupId,
		tags: input.tags,
		remark: input.remark,
		notes: input.notes,
		platform_label: input.platformLabel,
		proxy_mode: input.proxyMode,
		proxy_id: input.proxyId,
		custom_proxy: input.customProxy,
		browser: input.browser
			? {
					startup_urls: input.browser.startupUrls,
					download_mode: input.browser.downloadMode,
					custom_download_dir: input.browser.customDownloadDir,
					window_mode: input.browser.windowMode,
					restore_session: input.browser.restoreSession,
				}
			: undefined,
	};
}

export const profileApi = {
	list(search?: string) {
		return invokeCommand<Profile[]>("profile_list", { search });
	},

	listPage(query: ProfileListQuery) {
		return invokeCommand<ProfileListPage>("profile_list_page", {
			query: toListQuery(query),
		});
	},

	get(id: string) {
		return invokeCommand<Profile>("profile_get", { id });
	},

	create(input: CreateProfileInput) {
		return invokeCommand<Profile>("profile_create", { input });
	},

	createFull(input: CreateProfileFullInput) {
		return invokeCommand<Profile>("profile_create_full", {
			input: toCreateFullInput(input),
		});
	},

	update(id: string, input: UpdateProfileInput) {
		return invokeCommand<Profile>("profile_update", { id, input });
	},

	bulkUpdate(input: BulkProfileUpdateInput) {
		return invokeCommand<void>("profile_bulk_update", {
			input: {
				profile_ids: input.profileIds,
				group_id: input.groupId,
				add_tags: input.addTags,
				remove_tags: input.removeTags,
				proxy_id: input.proxyId,
			},
		});
	},

	archive(id: string) {
		return invokeCommand<void>("profile_archive", { id });
	},

	moveToTrash(id: string) {
		return invokeCommand<void>("profile_move_to_trash", { id });
	},

	restore(id: string) {
		return invokeCommand<Profile>("profile_restore", { id });
	},

	deletePermanent(id: string) {
		return invokeCommand<void>("profile_delete_permanent", { id });
	},

	duplicate(id: string, name?: string) {
		return invokeCommand<Profile>("profile_duplicate", {
			id,
			input: { name },
		});
	},

	listActivity(limit?: number) {
		return invokeCommand<ActivityEvent[]>("profile_activity_list", { limit });
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
