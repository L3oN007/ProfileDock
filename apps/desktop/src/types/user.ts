export type UserPlan = "guest" | "free" | "pro";

export interface AppUser {
	id: string;
	name: string;
	email: string | null;
	avatarUrl: string | null;
	plan: UserPlan;
	isAuthenticated: boolean;
}

export const GUEST_USER: AppUser = {
	id: "guest",
	name: "Guest",
	email: null,
	avatarUrl: null,
	plan: "guest",
	isAuthenticated: false,
};
