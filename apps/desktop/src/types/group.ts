export interface ProfileGroup {
	id: string;
	name: string;
	sort_order: number;
	profile_count: number;
	created_at: string;
	updated_at: string;
}

export interface CreateGroupInput {
	name: string;
}

export interface UpdateGroupInput {
	name?: string;
	sort_order?: number;
}
