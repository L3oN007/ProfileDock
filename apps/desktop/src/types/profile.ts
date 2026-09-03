export type ProfileState = "ready" | "running" | "error" | "archived";

export interface Profile {
	id: string;
	name: string;
	description: string | null;
	browser_provider: string;
	state: ProfileState;
	is_archived: boolean;
	pid: number | null;
	instance_id: string | null;
	last_opened_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface CreateProfileInput {
	name: string;
	description?: string;
	browser_provider?: string;
}

export interface UpdateProfileInput {
	name?: string;
	description?: string;
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
