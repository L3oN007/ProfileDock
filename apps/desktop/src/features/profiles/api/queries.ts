import { useQuery } from "@tanstack/react-query";

import { browserSettingsApi } from "@/lib/tauri/browser-settings";
import { profileApi } from "@/lib/tauri/profile";
import { isDesktopRuntime } from "@/lib/tauri/runtime";
import type { ProfileListQuery } from "@/types/profile";

import { profileKeys } from "./profile-keys";

export function useProfileBrowserSettings(profileId: string) {
	return useQuery({
		queryKey: profileKeys.browserSettings(profileId),
		queryFn: () => browserSettingsApi.get(profileId),
		enabled: isDesktopRuntime() && Boolean(profileId),
	});
}

export function useProfilePreflight(profileId: string, enabled = false) {
	return useQuery({
		queryKey: profileKeys.preflight(profileId),
		queryFn: () => browserSettingsApi.preflight(profileId),
		enabled: isDesktopRuntime() && Boolean(profileId) && enabled,
	});
}

export function useProfileListPage(query: ProfileListQuery) {
	const desktop = isDesktopRuntime();
	const queryKey = JSON.stringify(query);

	return useQuery({
		queryKey: profileKeys.listPage(queryKey),
		queryFn: () => profileApi.listPage(query),
		enabled: desktop,
		refetchInterval: desktop ? 3_000 : false,
	});
}

export function useProfileActivity(limit = 100) {
	return useQuery({
		queryKey: profileKeys.activity(),
		queryFn: () => profileApi.listActivity(limit),
		enabled: isDesktopRuntime(),
	});
}

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

export function useProfileStorage(profileId: string) {
	return useQuery({
		queryKey: profileKeys.storage(profileId),
		queryFn: () => profileApi.getStorage(profileId),
		enabled: isDesktopRuntime() && Boolean(profileId),
	});
}

export function useProfileEvents(id: string) {
	return useQuery({
		queryKey: profileKeys.events(id),
		queryFn: () => profileApi.listEvents(id),
		enabled: isDesktopRuntime() && Boolean(id),
	});
}
