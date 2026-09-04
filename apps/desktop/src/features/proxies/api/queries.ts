import { useQuery } from "@tanstack/react-query";

import { proxyApi } from "@/lib/tauri/proxy";
import { isDesktopRuntime } from "@/lib/tauri/runtime";

import { proxyKeys } from "./proxy-keys";

export function useProxies() {
	const desktop = isDesktopRuntime();

	return useQuery({
		queryKey: proxyKeys.list(),
		queryFn: () => proxyApi.list(),
		enabled: desktop,
	});
}

export function useProxy(id: string) {
	return useQuery({
		queryKey: proxyKeys.detail(id),
		queryFn: () => proxyApi.get(id),
		enabled: isDesktopRuntime() && Boolean(id),
	});
}

export function useProxyChecks(id: string) {
	return useQuery({
		queryKey: proxyKeys.checks(id),
		queryFn: () => proxyApi.listChecks(id, 20),
		enabled: isDesktopRuntime() && Boolean(id),
	});
}

export function useProxyAssignments(id: string) {
	return useQuery({
		queryKey: proxyKeys.assignments(id),
		queryFn: () => proxyApi.listAssignments(id),
		enabled: isDesktopRuntime() && Boolean(id),
	});
}

export function useProfileProxyAssignment(profileId: string) {
	return useQuery({
		queryKey: proxyKeys.profileAssignment(profileId),
		queryFn: () => proxyApi.getProfileAssignment(profileId),
		enabled: isDesktopRuntime() && Boolean(profileId),
	});
}
