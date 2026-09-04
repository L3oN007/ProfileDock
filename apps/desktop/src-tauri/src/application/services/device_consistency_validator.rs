use crate::domain::device::{
    DeviceConfigurationMode, DevicePlatform, DeviceWarningDto, find_preset,
    validate_device_memory_gb, validate_hardware_concurrency, validate_screen_size,
    ProfileDeviceSettings,
};

pub struct DeviceConsistencyValidator;

impl DeviceConsistencyValidator {
    pub fn validate(settings: &ProfileDeviceSettings) -> crate::domain::device::DeviceValidationResult {
        let mut warnings = Vec::new();

        if settings.mode != DeviceConfigurationMode::Custom {
            return crate::domain::device::DeviceValidationResult {
                valid: true,
                warnings,
            };
        }

        let platform = settings.platform.unwrap_or_default();

        if let Some(preset_id) = &settings.hardware_preset_id {
            if let Some(preset) = find_preset(preset_id) {
                if preset.platform != platform {
                    warnings.push(DeviceWarningDto {
                        code: "platform_preset_mismatch".into(),
                        message: format!(
                            "GPU preset is inconsistent with selected platform ({}).",
                            platform.label()
                        ),
                    });
                }

                if let Some(cores) = settings.hardware_concurrency {
                    if cores != preset.hardware_concurrency {
                        warnings.push(DeviceWarningDto {
                            code: "cpu_preset_mismatch".into(),
                            message: "CPU core count does not match the selected preset.".into(),
                        });
                    }
                }

                if let Some(memory) = settings.device_memory_gb {
                    if memory != preset.device_memory_gb {
                        warnings.push(DeviceWarningDto {
                            code: "memory_preset_mismatch".into(),
                            message: "Device memory does not match the selected preset.".into(),
                        });
                    }
                }

                if let (Some(width), Some(height)) = (settings.screen_width, settings.screen_height)
                {
                    if width != preset.screen_width || height != preset.screen_height {
                        warnings.push(DeviceWarningDto {
                            code: "screen_preset_mismatch".into(),
                            message: "Screen dimensions do not match the selected preset.".into(),
                        });
                    }
                }
            }
        }

        if platform == DevicePlatform::Macos {
            if let Some(vendor) = settings.gpu.vendor.as_deref() {
                if vendor.contains("NVIDIA") {
                    warnings.push(DeviceWarningDto {
                        code: "gpu_platform_mismatch".into(),
                        message: "NVIDIA GPU preset is inconsistent with macOS platform.".into(),
                    });
                }
            }
        }

        if let Some(cores) = settings.hardware_concurrency {
            if validate_hardware_concurrency(cores).is_err() {
                warnings.push(DeviceWarningDto {
                    code: "cpu_invalid".into(),
                    message: "CPU core count is outside supported bounds.".into(),
                });
            }
        }

        if let Some(memory) = settings.device_memory_gb {
            if validate_device_memory_gb(memory).is_err() {
                warnings.push(DeviceWarningDto {
                    code: "memory_invalid".into(),
                    message: "Device memory is outside supported bounds.".into(),
                });
            }
        }

        if let (Some(width), Some(height)) = (settings.screen_width, settings.screen_height) {
            if validate_screen_size(width, height).is_err() {
                warnings.push(DeviceWarningDto {
                    code: "screen_invalid".into(),
                    message: "Screen dimensions are outside supported bounds.".into(),
                });
            }
        }

        crate::domain::device::DeviceValidationResult {
            valid: true,
            warnings,
        }
    }
}
