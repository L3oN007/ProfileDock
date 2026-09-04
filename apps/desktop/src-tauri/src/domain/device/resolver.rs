use crate::domain::device::{
    DeviceConfigurationMode, DevicePlatform, WebRtcMode,
};
use crate::domain::cloak::CloakCapabilities;

#[derive(Debug, Clone)]
pub struct ResolvedDeviceConfig {
    pub fingerprint_seed: u64,
    pub platform: DevicePlatform,
    pub hardware_concurrency: Option<u8>,
    pub device_memory_gb: Option<u8>,
    pub screen_width: Option<u32>,
    pub screen_height: Option<u32>,
    pub gpu_vendor: Option<String>,
    pub gpu_renderer: Option<String>,
    pub timezone: Option<String>,
    pub locale: Option<String>,
    pub webrtc_mode: WebRtcMode,
    pub hardware_preset_id: Option<String>,
    pub mode: DeviceConfigurationMode,
}

pub struct DeviceConfigResolver;

impl DeviceConfigResolver {
    pub fn resolve(
        settings: &crate::domain::device::ProfileDeviceSettings,
        capabilities: &CloakCapabilities,
        has_proxy: bool,
    ) -> ResolvedDeviceConfig {
        use crate::domain::device::{DeviceConfigurationMode, EnvironmentMode, GpuMode};

        let platform = settings.platform.unwrap_or_default();
        let mut resolved = ResolvedDeviceConfig {
            fingerprint_seed: settings.fingerprint_seed,
            platform,
            hardware_concurrency: None,
            device_memory_gb: None,
            screen_width: None,
            screen_height: None,
            gpu_vendor: None,
            gpu_renderer: None,
            timezone: None,
            locale: None,
            webrtc_mode: settings.webrtc_mode,
            hardware_preset_id: settings.hardware_preset_id.clone(),
            mode: settings.mode,
        };

        if settings.mode == DeviceConfigurationMode::Custom {
            if capabilities.hardware_concurrency_override {
                resolved.hardware_concurrency = settings.hardware_concurrency;
            }
            if capabilities.device_memory_override {
                resolved.device_memory_gb = settings.device_memory_gb;
            }
            if capabilities.screen_override {
                resolved.screen_width = settings.screen_width;
                resolved.screen_height = settings.screen_height;
            }
            if capabilities.gpu_override && settings.gpu.mode == GpuMode::Custom {
                resolved.gpu_vendor = settings.gpu.vendor.clone();
                resolved.gpu_renderer = settings.gpu.renderer.clone();
            }
        }

        resolved.timezone = match settings.timezone_mode {
            EnvironmentMode::Custom => settings.timezone.clone(),
            EnvironmentMode::Proxy if has_proxy => None,
            EnvironmentMode::Proxy | EnvironmentMode::System => None,
        };

        resolved.locale = match settings.locale_mode {
            EnvironmentMode::Custom => settings.locale.clone(),
            EnvironmentMode::Proxy if has_proxy => None,
            EnvironmentMode::Proxy | EnvironmentMode::System => None,
        };

        if !capabilities.webrtc_ip_override {
            resolved.webrtc_mode = WebRtcMode::Proxy;
        }

        resolved
    }
}

#[cfg(test)]
mod tests {
    use chrono::Utc;

    use super::*;
    use crate::domain::device::{GpuSettings, ProfileDeviceSettings};

    #[test]
    fn automatic_mode_does_not_emit_hardware_overrides() {
        let settings = ProfileDeviceSettings::defaults("p1".into(), Utc::now());
        let capabilities = CloakCapabilities::default();
        let resolved = DeviceConfigResolver::resolve(&settings, &capabilities, true);
        assert_eq!(resolved.mode, DeviceConfigurationMode::Automatic);
        assert!(resolved.hardware_concurrency.is_none());
        assert!(resolved.gpu_vendor.is_none());
    }
}
