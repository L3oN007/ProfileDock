import { useQuery } from "@tanstack/react-query";

import { type AppUser, GUEST_USER } from "@/types/user";

const STORAGE_KEY = "profiledock:user";

export const userKeys = {
	all: ["app-user"] as const,
	session: () => [...userKeys.all, "session"] as const,
};

function readStoredUser(): AppUser | null {
	if (typeof window === "undefined") return null;

	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		return JSON.parse(raw) as AppUser;
	} catch {
		return null;
	}
}

export function saveAppUser(user: AppUser) {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearAppUser() {
	localStorage.removeItem(STORAGE_KEY);
}

export function useAppUser() {
	return useQuery({
		queryKey: userKeys.session(),
		queryFn: async () => readStoredUser() ?? GUEST_USER,
		staleTime: Number.POSITIVE_INFINITY,
	});
}

export function getUserInitials(name: string) {
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase() ?? "")
		.join("");
}
