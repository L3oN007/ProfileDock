export type DeviceConfigurationMode = "automatic" | "custom";
export type DevicePlatform = "windows" | "macos" | "linux";
export type EnvironmentMode = "proxy" | "custom" | "system";
export type WebRtcMode = "proxy" | "real" | "disabled";

export interface ProfileDeviceSettings {
	profile_id: string;
	mode: DeviceConfigurationMode;
	fingerprint_seed: number;
	platform: DevicePlatform | null;
	hardware_concurrency: number | null;
	device_memory_gb: number | null;
	screen_width: number | null;
	screen_height: number | null;
	gpu_mode: "automatic" | "custom";
	gpu_vendor: string | null;
	gpu_renderer: string | null;
	hardware_preset_id: string | null;
	timezone_mode: EnvironmentMode;
	timezone: string | null;
	locale_mode: EnvironmentMode;
	locale: string | null;
	webrtc_mode: WebRtcMode;
	created_at: string;
	updated_at: string;
}

export interface CreateProfileDeviceInput {
	mode?: DeviceConfigurationMode;
	platform?: DevicePlatform;
	hardwarePresetId?: string;
	hardwareConcurrency?: number;
	deviceMemoryGb?: number;
	screenWidth?: number;
	screenHeight?: number;
	timezoneMode?: EnvironmentMode;
	timezone?: string;
	localeMode?: EnvironmentMode;
	locale?: string;
	webrtcMode?: WebRtcMode;
}

export interface UpdateProfileDeviceSettingsInput {
	mode?: DeviceConfigurationMode;
	platform?: DevicePlatform;
	hardwareConcurrency?: number;
	deviceMemoryGb?: number;
	screenWidth?: number;
	screenHeight?: number;
	gpuMode?: "automatic" | "custom";
	hardwarePresetId?: string;
	timezoneMode?: EnvironmentMode;
	timezone?: string;
	localeMode?: EnvironmentMode;
	locale?: string;
	webrtcMode?: WebRtcMode;
}

export interface HardwarePreset {
	id: string;
	label: string;
	platform: DevicePlatform;
	hardware_concurrency: number;
	device_memory_gb: number;
	screen_width: number;
	screen_height: number;
	gpu_vendor: string;
	gpu_renderer: string;
}

export interface DeviceValidationResult {
	valid: boolean;
	warnings: { code: string; message: string }[];
}

export interface ResolvedDeviceOverview {
	fingerprint_seed: number;
	mode: DeviceConfigurationMode;
	platform: string;
	hardware_concurrency: string | null;
	device_memory_gb: string | null;
	screen: string | null;
	gpu: string | null;
	timezone: string;
	locale: string;
	webrtc: string;
	fingerprint_engine: string;
}
