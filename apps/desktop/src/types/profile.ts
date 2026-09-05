import type { CreateProfileDeviceInput } from "@/types/device";
import type { ProfileTag, TagAssignment } from "@/types/tag";

export type ProfileState = "ready" | "running" | "error" | "archived";

export interface Profile {
	id: string;
	display_id: string | null;
	name: string;
	description: string | null;
	group_id: string | null;
	group_name: string | null;
	tags: ProfileTag[];
	remark: string | null;
	notes: string | null;
	platform_label: string | null;
	state: ProfileState;
	is_archived: boolean;
	pid: number | null;
	instance_id: string | null;
	proxy_id: string | null;
	proxy_name: string | null;
	google_account: string | null;
	last_opened_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface ProfileListQuery {
	search?: string;
	groupId?: string;
	tagIds?: string[];
	status?: string;
	proxyId?: string;
	sort?: string;
	page?: number;
	pageSize?: number;
	includeArchived?: boolean;
}

export interface ProfileListPage {
	items: Profile[];
	total: number;
	page: number;
	page_size: number;
}

export interface CreateProfileInput {
	name: string;
	description?: string;
}

export interface CreateProfileFullInput {
	name: string;
	description?: string;
	groupId?: string;
	tags?: string[];
	tagItems?: TagAssignment[];
	remark?: string;
	notes?: string;
	platformLabel?: string;
	proxyMode?: "none" | "saved" | "custom";
	proxyId?: string;
	customProxy?: {
		name: string;
		protocol: string;
		host: string;
		port: number;
		username?: string;
		password?: string;
	};
	browser?: {
		startupUrls?: string[];
		downloadMode?: "profile" | "custom";
		customDownloadDir?: string;
		windowMode?: "normal" | "maximized";
		restoreSession?: boolean;
	};
	device?: CreateProfileDeviceInput;
}

export interface UpdateProfileInput {
	name?: string;
	description?: string;
}

export interface UpdateProfileFullInput {
	name?: string;
	description?: string;
	groupId?: string | null;
	tags?: string[];
	tagItems?: TagAssignment[];
	remark?: string;
	notes?: string;
	platformLabel?: string;
	proxyMode?: "none" | "saved";
	proxyId?: string;
	browser?: {
		startupUrls?: string[];
		downloadMode?: "profile" | "custom";
		customDownloadDir?: string;
		windowMode?: "normal" | "maximized";
		restoreSession?: boolean;
	};
}

export interface ProfileStorage {
	browser_data_bytes: number;
	cache_bytes: number;
	downloads_bytes: number;
	total_bytes: number;
}

export interface BulkProfileUpdateInput {
	profileIds: string[];
	groupId?: string | null;
	addTags?: string[];
	removeTags?: string[];
	proxyId?: string | null;
}

export interface ActivityEvent {
	id: number;
	profile_id: string;
	profile_name: string;
	display_id: string | null;
	event_type: string;
	metadata_json: string | null;
	created_at: string;
}

export interface BrowserInstance {
	id: string;
	profile_id: string;
	pid: number | null;
	state: string;
	started_at: string | null;
	stopped_at: string | null;
	exit_code: number | null;
	error_message: string | null;
}

export interface ProfileEvent {
	id: number;
	profile_id: string;
	event_type: string;
	metadata_json: string | null;
	created_at: string;
}
