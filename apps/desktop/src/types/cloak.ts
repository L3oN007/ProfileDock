export interface CloakInstallation {
	executable: string | null;
	version: string | null;
	valid: boolean;
	compatible: boolean;
	last_checked_at: string;
	source: string | null;
	root_dir: string | null;
	cache_dir: string | null;
}

export interface DiscoveredCloakInstallation {
	executable: string;
	root_dir: string;
	version: string | null;
	source: string;
	valid: boolean;
}

export interface CloakValidationResult {
	valid: boolean;
	compatible: boolean;
	executable: string | null;
	version: string | null;
	message: string | null;
}

export interface CloakCapabilities {
	startup_urls: boolean;
	custom_download_dir: boolean;
	proxy: boolean;
	proxy_auth: boolean;
	extension_loading: boolean;
	window_configuration: boolean;
	fingerprint_seed: boolean;
	hardware_concurrency_override: boolean;
	device_memory_override: boolean;
	screen_override: boolean;
	gpu_override: boolean;
	timezone_override: boolean;
	locale_override: boolean;
	webrtc_ip_override: boolean;
}

export interface ProfileBrowserSettings {
	profile_id: string;
	startup_urls: string[];
	download_mode: "profile" | "custom";
	custom_download_dir: string | null;
	window_mode: "normal" | "maximized";
	restore_session: boolean;
	created_at: string;
	updated_at: string;
}

export interface UpdateBrowserSettingsInput {
	startup_urls?: string[];
	download_mode?: "profile" | "custom";
	custom_download_dir?: string;
	window_mode?: "normal" | "maximized";
	restore_session?: boolean;
}

export interface PreflightWarning {
	code: string;
	message: string;
}

export interface PreflightResult {
	ready: boolean;
	warnings: PreflightWarning[];
}

export interface CloakRuntime {
	id: string;
	version: string;
	platform: string;
	arch: string;
	root_dir: string;
	executable_path: string;
	sha256: string | null;
	source: string;
	active: boolean;
	installed_at: string;
	validated_at: string | null;
}

export interface CloakRuntimeStatus {
	installed: boolean;
	active_runtime: CloakRuntime | null;
	managed_count: number;
}

export type CloakInstallPhase =
	| "resolving"
	| "downloading"
	| "verifying"
	| "extracting"
	| "validating"
	| "completed"
	| "failed"
	| "cancelled";

export interface CloakInstallProgress {
	phase: CloakInstallPhase;
	version: string | null;
	downloaded_bytes: number;
	total_bytes: number | null;
	percent: number | null;
	message: string | null;
}

export interface CloakRuntimeUpdateInfo {
	current_version: string | null;
	available_version: string | null;
	update_available: boolean;
}
