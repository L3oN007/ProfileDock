export const proxyKeys = {
	all: ["proxies"] as const,
	list: () => [...proxyKeys.all, "list"] as const,
	detail: (id: string) => [...proxyKeys.all, "detail", id] as const,
	checks: (id: string) => [...proxyKeys.detail(id), "checks"] as const,
	assignments: (id: string) =>
		[...proxyKeys.detail(id), "assignments"] as const,
	profileAssignment: (profileId: string) =>
		[...proxyKeys.all, "profile-assignment", profileId] as const,
};
