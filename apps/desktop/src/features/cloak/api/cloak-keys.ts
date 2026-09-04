export const cloakKeys = {
	all: ["cloak"] as const,
	installation: () => [...cloakKeys.all, "installation"] as const,
	capabilities: () => [...cloakKeys.all, "capabilities"] as const,
	discovered: () => [...cloakKeys.all, "discovered"] as const,
	runtimeStatus: () => [...cloakKeys.all, "runtime-status"] as const,
	runtimeList: () => [...cloakKeys.all, "runtime-list"] as const,
	runtimeUpdate: () => [...cloakKeys.all, "runtime-update"] as const,
};
