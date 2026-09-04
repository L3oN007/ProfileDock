export const profileKeys = {
	all: ["profiles"] as const,
	list: (search?: string) =>
		[...profileKeys.all, "list", search ?? ""] as const,
	listPage: (queryKey: string) =>
		[...profileKeys.all, "list-page", queryKey] as const,
	activity: () => [...profileKeys.all, "activity"] as const,
	detail: (id: string) => [...profileKeys.all, "detail", id] as const,
	events: (id: string) => [...profileKeys.all, "events", id] as const,
	browserSettings: (id: string) =>
		[...profileKeys.all, "browser-settings", id] as const,
	preflight: (id: string) => [...profileKeys.all, "preflight", id] as const,
	storage: (id: string) => [...profileKeys.all, "storage", id] as const,
};
