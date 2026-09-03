export const profileKeys = {
	all: ["profiles"] as const,
	list: (search?: string) => [...profileKeys.all, "list", search ?? ""] as const,
	detail: (id: string) => [...profileKeys.all, "detail", id] as const,
	events: (id: string) => [...profileKeys.all, "events", id] as const,
};
