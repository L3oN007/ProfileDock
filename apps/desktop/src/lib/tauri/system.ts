import type {
	AppInfo,
	AppPathsInfo,
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
