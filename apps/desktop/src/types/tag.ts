export interface Tag {
	id: string;
	name: string;
	profile_count: number;
	created_at: string;
}

export interface CreateTagInput {
	name: string;
}
