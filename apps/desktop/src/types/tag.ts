export interface Tag {
	id: string;
	name: string;
	color: string;
	profile_count: number;
	created_at: string;
}

export interface CreateTagInput {
	name: string;
	color?: string;
}

export interface UpdateTagInput {
	color: string;
}

export interface TagAssignment {
	name: string;
	color: string;
}

export interface ProfileTag {
	id: string;
	name: string;
	color: string;
}
