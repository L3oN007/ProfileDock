import type {
	CreateProfileDeviceInput,
	DeviceValidationResult,
	HardwarePreset,
	ProfileDeviceSettings,
	ResolvedDeviceOverview,
	UpdateProfileDeviceSettingsInput,
} from "@/types/device";

import { invokeCommand } from "./client";

function toCreateDeviceInput(input: CreateProfileDeviceInput) {
	return {
		mode: input.mode,
		platform: input.platform,
		hardware_preset_id: input.hardwarePresetId,
		hardware_concurrency: input.hardwareConcurrency,
		device_memory_gb: input.deviceMemoryGb,
		screen_width: input.screenWidth,
		screen_height: input.screenHeight,
		timezone_mode: input.timezoneMode,
		timezone: input.timezone,
		locale_mode: input.localeMode,
		locale: input.locale,
		webrtc_mode: input.webrtcMode,
	};
}

function toUpdateDeviceInput(input: UpdateProfileDeviceSettingsInput) {
	return {
		mode: input.mode,
		platform: input.platform,
		hardware_concurrency: input.hardwareConcurrency,
		device_memory_gb: input.deviceMemoryGb,
		screen_width: input.screenWidth,
		screen_height: input.screenHeight,
		gpu_mode: input.gpuMode,
		hardware_preset_id: input.hardwarePresetId,
		timezone_mode: input.timezoneMode,
		timezone: input.timezone,
		locale_mode: input.localeMode,
		locale: input.locale,
		webrtc_mode: input.webrtcMode,
	};
}

export const deviceApi = {
	get(profileId: string) {
		return invokeCommand<ProfileDeviceSettings>("profile_device_settings_get", {
			profileId,
		});
	},
	update(profileId: string, input: UpdateProfileDeviceSettingsInput) {
		return invokeCommand<ProfileDeviceSettings>(
			"profile_device_settings_update",
			{ profileId, input: toUpdateDeviceInput(input) },
		);
	},
	regenerate(profileId: string) {
		return invokeCommand<ProfileDeviceSettings>(
			"profile_device_settings_regenerate",
			{ profileId },
		);
	},
	validate(profileId: string) {
		return invokeCommand<DeviceValidationResult>(
			"profile_device_settings_validate",
			{ profileId },
		);
	},
	overview(profileId: string) {
		return invokeCommand<ResolvedDeviceOverview>(
			"profile_device_settings_overview",
			{ profileId },
		);
	},
	listPresets() {
		return invokeCommand<HardwarePreset[]>("device_presets_list");
	},
	toCreatePayload(input: CreateProfileDeviceInput) {
		return toCreateDeviceInput(input);
	},
};
