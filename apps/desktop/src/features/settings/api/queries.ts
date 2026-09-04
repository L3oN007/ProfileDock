import { useQuery } from "@tanstack/react-query";
import { isDesktopRuntime } from "@/lib/tauri/runtime";
import { checkAppUpdate, getAppInfo } from "@/lib/tauri/system";

export const appUpdateKeys = {
	all: ["app-update"] as const,
	info: () => [...appUpdateKeys.all, "info"] as const,
	appInfo: () => [...appUpdateKeys.all, "app-info"] as const,
};

export function useAppInfo() {
	const desktop = isDesktopRuntime();
	return useQuery({
		queryKey: appUpdateKeys.appInfo(),
		queryFn: () => getAppInfo(),
		enabled: desktop,
		staleTime: 60_000,
	});
}

export function useAppUpdateCheck() {
	const desktop = isDesktopRuntime();
	return useQuery({
		queryKey: appUpdateKeys.info(),
		queryFn: () => checkAppUpdate(),
		enabled: desktop,
		staleTime: 30 * 60_000,
		refetchOnWindowFocus: true,
		retry: 1,
	});
}
