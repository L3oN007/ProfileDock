import { useQuery } from "@tanstack/react-query";

import { profileApi } from "@/lib/tauri/profile";
import { isDesktopRuntime } from "@/lib/tauri/runtime";

import { profileKeys } from "./profile-keys";

export function useProfiles(search?: string) {
	const desktop = isDesktopRuntime();

	return useQuery({
		queryKey: profileKeys.list(search),
		queryFn: () => profileApi.list(search),
		enabled: desktop,
		refetchInterval: desktop ? 3_000 : false,
	});
}

export function useProfile(id: string) {
	return useQuery({
		queryKey: profileKeys.detail(id),
		queryFn: () => profileApi.get(id),
		enabled: isDesktopRuntime() && Boolean(id),
	});
}

export function useProfileEvents(id: string) {
	return useQuery({
		queryKey: profileKeys.events(id),
		queryFn: () => profileApi.listEvents(id),
		enabled: isDesktopRuntime() && Boolean(id),
	});
}
