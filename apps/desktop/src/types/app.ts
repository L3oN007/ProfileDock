export interface AppError {
	code: string;
	message: string;
	details?: unknown;
}

export interface AppInfo {
	name: string;
	version: string;
	identifier: string;
}

export interface SystemInfo {
	os: string;
	arch: string;
	family: string;
}

export interface AppPathsInfo {
	root: string;
	database: string;
	logs: string;
	profiles: string;
	browsers: string;
	cache: string;
	temp: string;
}

export type HealthStatus =
	| "ok"
	| "error"
	| "detected"
	| "notdetected"
	| "unknown"
	| "unavailable";

export interface HealthCheck {
	database: HealthStatus;
	filesystem: HealthStatus;
	browser: HealthStatus;
}

export type BrowserDetectionStatus = "detected" | "notdetected" | "invalid";

export interface BrowserStatus {
	provider: string;
	status: BrowserDetectionStatus;
	executable: string | null;
	version: string | null;
}

export interface AppUpdateInfo {
	currentVersion: string;
	latestVersion: string | null;
	updateAvailable: boolean;
	releaseUrl: string | null;
	releaseNotes: string | null;
	publishedAt: string | null;
	checkStatus: "ok" | "unavailable" | "noPublishedRelease";
	message: string | null;
}
