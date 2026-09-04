import type {
	AppInfo,
	AppPathsInfo,
	AppUpdateInfo,
	HealthCheck,
	SystemInfo,
} from "@/types/app";

import { invokeCommand } from "./client";

export function getAppInfo() {
	return invokeCommand<AppInfo>("get_app_info");
}

export function getSystemInfo() {
	return invokeCommand<SystemInfo>("get_system_info");
}

export function getAppPaths() {
	return invokeCommand<AppPathsInfo>("get_app_paths");
}

export function healthCheck() {
	return invokeCommand<HealthCheck>("health_check");
}

export function checkAppUpdate() {
	return invokeCommand<AppUpdateInfo>("check_app_update");
}

export function openExternalUrl(url: string) {
	return invokeCommand<void>("open_external_url", { url });
}

export function getReleasesPageUrl() {
	return invokeCommand<string>("get_releases_page_url");
}
