use crate::domain::cloak::{CloakInstallation, CloakLaunchConfig};
use crate::domain::device::{
    host_platform, is_host_matched_platform, DeviceConfigurationMode, DevicePlatform,
    ResolvedDeviceConfig, WebRtcMode,
};
use crate::error::AppError;
use crate::infrastructure::cloak::version::{version_at_least, MAXIMIZED_WINDOW_MIN_VERSION};
use crate::infrastructure::process::{ProcessSpec, ProcessType};

pub struct CloakLaunchBuilder {
    installation: CloakInstallation,
}

impl CloakLaunchBuilder {
    pub fn new(installation: CloakInstallation) -> Self {
        Self { installation }
    }

    pub fn build(
        &self,
        config: &CloakLaunchConfig,
        instance_id: String,
    ) -> Result<ProcessSpec, AppError> {
        let executable = &self.installation.executable;
        let has_proxy = config.proxy.is_some();

        let mut args = vec![
            format!("--user-data-dir={}", config.user_data_dir.to_string_lossy()),
            format!("--download-dir={}", config.download_dir.to_string_lossy()),
            "--no-first-run".to_string(),
            "--no-default-browser-check".to_string(),
        ];

        append_stealth_baseline(&mut args);

        if !config.restore_session {
            args.push("--no-restore-session".to_string());
        }

        for url in &config.startup_urls {
            args.push(url.clone());
        }

        if let Some(proxy) = &config.proxy {
            let scheme = proxy.protocol.proxy_scheme();
            let proxy_server =
                if let (Some(username), Some(password)) = (&proxy.username, &proxy.password) {
                    format!(
                        "{scheme}://{username}:{password}@{host}:{port}",
                        host = proxy.host,
                        port = proxy.port
                    )
                } else {
                    format!(
                        "{scheme}://{host}:{port}",
                        host = proxy.host,
                        port = proxy.port
                    )
                };
            args.push(format!("--proxy-server={proxy_server}"));
        } else {
            args.push("--proxy-server=direct://".to_string());
        }

        append_fingerprint_args(
            &mut args,
            &config.device,
            has_proxy,
            config.cloak_version.as_deref(),
            config.host_screen_width,
            config.host_screen_height,
        );
        append_window_args(
            &mut args,
            &config.device,
            config.cloak_version.as_deref(),
            config.host_screen_width,
            config.host_screen_height,
        );

        Ok(ProcessSpec {
            executable: executable.clone(),
            args,
            working_dir: None,
            process_type: ProcessType::Browser,
            profile_id: config.profile_id.clone(),
            instance_id,
        })
    }
}

/// CloakBrowser FPJS config: noise off; avoid non-default blink flags (tampering banner).
fn append_stealth_baseline(args: &mut Vec<String>) {
    args.push("--fingerprint-noise=false".to_string());
    args.push("--ignore-gpu-blocklist".to_string());
}

fn append_fingerprint_args(
    args: &mut Vec<String>,
    device: &ResolvedDeviceConfig,
    has_proxy: bool,
    cloak_version: Option<&str>,
    host_screen_width: Option<u32>,
    host_screen_height: Option<u32>,
) {
    args.push(format!("--fingerprint={}", device.fingerprint_seed));
    let (screen_width, screen_height) =
        resolve_launch_screen(device, host_screen_width, host_screen_height);

    match device.mode {
        DeviceConfigurationMode::Automatic => {
            args.push(format!(
                "--fingerprint-platform={}",
                device.platform.as_str()
            ));
            append_legacy_automatic_screen_args(args, cloak_version, screen_width, screen_height);
        }
        DeviceConfigurationMode::Custom => {
            append_custom_fingerprint_args(args, device, screen_width, screen_height);
        }
    }

    if let Some(timezone) = &device.timezone {
        args.push(format!("--fingerprint-timezone={timezone}"));
    }
    if let Some(locale) = &device.locale {
        args.push(format!("--fingerprint-locale={locale}"));
        args.push(format!("--lang={locale}"));
    }

    match device.webrtc_mode {
        WebRtcMode::Proxy if has_proxy => {
            args.push("--fingerprint-webrtc-ip=auto".to_string());
        }
        WebRtcMode::Disabled => {
            args.push("--fingerprint-webrtc-ip=disabled".to_string());
        }
        WebRtcMode::Real | WebRtcMode::Proxy => {}
    }
}

fn append_custom_fingerprint_args(
    args: &mut Vec<String>,
    device: &ResolvedDeviceConfig,
    screen_width: Option<u32>,
    screen_height: Option<u32>,
) {
    args.push(format!(
        "--fingerprint-platform={}",
        device.platform.as_str()
    ));

    if let Some(cores) = device.hardware_concurrency {
        args.push(format!("--fingerprint-hardware-concurrency={cores}"));
    }
    if let Some(memory) = device.device_memory_gb {
        args.push(format!("--fingerprint-device-memory={memory}"));
    }
    if let (Some(width), Some(height)) = (screen_width, screen_height) {
        args.push(format!("--fingerprint-screen-width={width}"));
        args.push(format!("--fingerprint-screen-height={height}"));
    }
    if let Some(vendor) = &device.gpu_vendor {
        args.push(format!("--fingerprint-gpu-vendor={vendor}"));
    }
    if let Some(renderer) = &device.gpu_renderer {
        args.push(format!("--fingerprint-gpu-renderer={renderer}"));
    }

    match device.platform {
        DevicePlatform::Windows => {
            args.push("--fingerprint-taskbar-height=48".to_string());
            if host_platform() == DevicePlatform::Linux {
                args.push("--fingerprint-windows-font-metrics".to_string());
            }
        }
        DevicePlatform::Macos => {
            args.push("--fingerprint-taskbar-height=95".to_string());
        }
        DevicePlatform::Linux => {}
    }
}

fn resolve_launch_screen(
    device: &ResolvedDeviceConfig,
    host_screen_width: Option<u32>,
    host_screen_height: Option<u32>,
) -> (Option<u32>, Option<u32>) {
    let profile_width = device.screen_width;
    let profile_height = device.screen_height;

    if is_host_matched_platform(device.platform) {
        if profile_width.is_some() && profile_height.is_some() {
            return (profile_width, profile_height);
        }
        return (host_screen_width, host_screen_height);
    }

    let (Some(host_width), Some(host_height)) = (host_screen_width, host_screen_height) else {
        return (profile_width, profile_height);
    };

    match (profile_width, profile_height) {
        (Some(width), Some(height)) if width != host_width || height != host_height => {
            (Some(host_width), Some(host_height))
        }
        (None, None) => (Some(host_width), Some(host_height)),
        _ => (profile_width, profile_height),
    }
}

fn append_legacy_automatic_screen_args(
    args: &mut Vec<String>,
    cloak_version: Option<&str>,
    screen_width: Option<u32>,
    screen_height: Option<u32>,
) {
    if version_at_least(cloak_version, MAXIMIZED_WINDOW_MIN_VERSION) {
        return;
    }

    if let (Some(width), Some(height)) = (screen_width, screen_height) {
        args.push(format!("--fingerprint-screen-width={width}"));
        args.push(format!("--fingerprint-screen-height={height}"));
    }
}

fn append_window_args(
    args: &mut Vec<String>,
    device: &ResolvedDeviceConfig,
    cloak_version: Option<&str>,
    host_screen_width: Option<u32>,
    host_screen_height: Option<u32>,
) {
    let (screen_width, screen_height) =
        resolve_launch_screen(device, host_screen_width, host_screen_height);

    if device.mode == DeviceConfigurationMode::Custom {
        if let (Some(width), Some(height)) = (screen_width, screen_height) {
            args.push(format!("--window-size={width},{height}"));
            return;
        }
    }

    if version_at_least(cloak_version, MAXIMIZED_WINDOW_MIN_VERSION) {
        args.push("--start-maximized".to_string());
        return;
    }

    if device.mode == DeviceConfigurationMode::Automatic {
        if let (Some(width), Some(height)) = (screen_width, screen_height) {
            args.push(format!("--window-size={width},{height}"));
        }
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use chrono::Utc;

    use std::path::Path;

    use super::*;
    use crate::domain::cloak::CloakCapabilities;
    use crate::domain::device::{DeviceConfigResolver, ProfileDeviceSettings};
    use crate::domain::profile::WindowMode;

    fn sample_installation() -> CloakInstallation {
        CloakInstallation {
            executable: PathBuf::from("/usr/bin/cloak-browser"),
            version: Some("1.0.0".into()),
            valid: true,
            last_checked_at: Utc::now(),
        }
    }

    #[test]
    fn automatic_mode_matches_cloakbrowser_wrapper_defaults() {
        let builder = CloakLaunchBuilder::new(sample_installation());
        let device_settings = ProfileDeviceSettings::defaults("profile-1".into(), Utc::now());
        let device =
            DeviceConfigResolver::resolve(&device_settings, &CloakCapabilities::default(), false);
        let config = CloakLaunchConfig {
            profile_id: "profile-1".into(),
            profile_name: "Test Profile".into(),
            user_data_dir: PathBuf::from("/data/profile/browser-data"),
            download_dir: PathBuf::from("/data/profile/downloads"),
            startup_urls: vec!["https://example.com".into()],
            proxy: None,
            proxy_id: None,
            window_mode: WindowMode::Normal,
            restore_session: true,
            cloak_version: Some("151.0.7922.108.3".into()),
            host_screen_width: None,
            host_screen_height: None,
            device,
        };

        let spec = builder.build(&config, "instance-1".into()).unwrap();
        assert_eq!(spec.executable, Path::new("/usr/bin/cloak-browser"));
        assert!(spec
            .args
            .iter()
            .any(|arg| arg.starts_with("--fingerprint=")));
        assert!(spec
            .args
            .iter()
            .any(|arg| arg.starts_with("--fingerprint-platform=")));
        assert!(spec.args.iter().any(|arg| arg == "--start-maximized"));
        assert!(spec
            .args
            .iter()
            .any(|arg| arg == "--fingerprint-noise=false"));
        assert!(!spec
            .args
            .iter()
            .any(|arg| arg.contains("AutomationControlled")));
        assert!(spec.args.iter().any(|arg| arg == "--ignore-gpu-blocklist"));
        assert!(!spec
            .args
            .iter()
            .any(|arg| arg.starts_with("--window-size=")));
    }

    #[test]
    fn automatic_mode_skips_start_maximized_on_legacy_binary() {
        let builder = CloakLaunchBuilder::new(sample_installation());
        let device_settings = ProfileDeviceSettings::defaults("profile-1".into(), Utc::now());
        let device =
            DeviceConfigResolver::resolve(&device_settings, &CloakCapabilities::default(), false);
        let config = CloakLaunchConfig {
            profile_id: "profile-1".into(),
            profile_name: "Test Profile".into(),
            user_data_dir: PathBuf::from("/data/profile/browser-data"),
            download_dir: PathBuf::from("/data/profile/downloads"),
            startup_urls: vec!["https://example.com".into()],
            proxy: None,
            proxy_id: None,
            window_mode: WindowMode::Normal,
            restore_session: true,
            cloak_version: Some("146.0.7680.177.5".into()),
            host_screen_width: Some(1920),
            host_screen_height: Some(1080),
            device,
        };

        let spec = builder.build(&config, "instance-1".into()).unwrap();
        assert!(!spec.args.iter().any(|arg| arg == "--start-maximized"));
        assert!(spec
            .args
            .iter()
            .any(|arg| arg == "--fingerprint-screen-width=1920"));
        assert!(spec.args.iter().any(|arg| arg == "--window-size=1920,1080"));
    }

    #[test]
    fn cross_platform_automatic_aligns_host_screen_on_legacy_binary() {
        use crate::domain::device::{
            DeviceConfigurationMode, DevicePlatform, GpuMode, GpuSettings, ProfileDeviceSettings,
        };

        let builder = CloakLaunchBuilder::new(sample_installation());
        let mut device_settings = ProfileDeviceSettings::defaults("profile-1".into(), Utc::now());
        device_settings.mode = DeviceConfigurationMode::Custom;
        device_settings.platform = Some(DevicePlatform::Macos);
        device_settings.screen_width = Some(2560);
        device_settings.screen_height = Some(1600);
        device_settings.gpu = GpuSettings {
            mode: GpuMode::Custom,
            vendor: Some("Apple Inc.".into()),
            renderer: Some("Apple M1".into()),
        };
        let device =
            DeviceConfigResolver::resolve(&device_settings, &CloakCapabilities::default(), false);
        assert_eq!(device.mode, DeviceConfigurationMode::Automatic);
        let config = CloakLaunchConfig {
            profile_id: "profile-1".into(),
            profile_name: "Test Profile".into(),
            user_data_dir: PathBuf::from("/data/profile/browser-data"),
            download_dir: PathBuf::from("/data/profile/downloads"),
            startup_urls: vec![],
            proxy: None,
            proxy_id: None,
            window_mode: WindowMode::Normal,
            restore_session: false,
            cloak_version: Some("146.0.7680.177.5".into()),
            host_screen_width: Some(1920),
            host_screen_height: Some(1080),
            device,
        };

        let spec = builder.build(&config, "instance-1".into()).unwrap();
        assert!(spec
            .args
            .iter()
            .any(|arg| arg == "--fingerprint-platform=macos"));
        assert!(spec
            .args
            .iter()
            .any(|arg| arg == "--fingerprint-screen-width=1920"));
        assert!(spec.args.iter().any(|arg| arg == "--window-size=1920,1080"));
        assert!(!spec
            .args
            .iter()
            .any(|arg| arg.starts_with("--fingerprint-gpu-")));
    }

    #[test]
    fn build_uses_direct_proxy_when_profile_has_no_proxy() {
        let builder = CloakLaunchBuilder::new(sample_installation());
        let device_settings = ProfileDeviceSettings::defaults("profile-1".into(), Utc::now());
        let device =
            DeviceConfigResolver::resolve(&device_settings, &CloakCapabilities::default(), false);
        let config = CloakLaunchConfig {
            profile_id: "profile-1".into(),
            profile_name: "Test Profile".into(),
            user_data_dir: PathBuf::from("/data/profile/browser-data"),
            download_dir: PathBuf::from("/data/profile/downloads"),
            startup_urls: vec![],
            proxy: None,
            proxy_id: None,
            window_mode: WindowMode::Normal,
            restore_session: false,
            cloak_version: Some("151.0.7922.108.3".into()),
            host_screen_width: None,
            host_screen_height: None,
            device,
        };

        let spec = builder.build(&config, "instance-1".into()).unwrap();
        assert!(spec
            .args
            .iter()
            .any(|arg| arg == "--proxy-server=direct://"));
        assert!(spec
            .args
            .iter()
            .any(|arg| arg == "--fingerprint-webrtc-ip=disabled"));
    }

    #[test]
    fn custom_mode_emits_cloak_fingerprint_flags_and_window_size() {
        use crate::domain::device::{
            DeviceConfigurationMode, DevicePlatform, GpuMode, GpuSettings, ProfileDeviceSettings,
        };

        let builder = CloakLaunchBuilder::new(sample_installation());
        let mut device_settings = ProfileDeviceSettings::defaults("profile-1".into(), Utc::now());
        device_settings.mode = DeviceConfigurationMode::Custom;
        device_settings.platform = Some(host_platform());
        device_settings.hardware_concurrency = Some(8);
        device_settings.device_memory_gb = Some(16);
        device_settings.screen_width = Some(1920);
        device_settings.screen_height = Some(1080);
        device_settings.gpu = GpuSettings {
            mode: GpuMode::Custom,
            vendor: Some("Google Inc. (NVIDIA)".into()),
            renderer: Some("NVIDIA GeForce GTX 1660".into()),
        };
        let device =
            DeviceConfigResolver::resolve(&device_settings, &CloakCapabilities::default(), false);
        let config = CloakLaunchConfig {
            profile_id: "profile-1".into(),
            profile_name: "Test Profile".into(),
            user_data_dir: PathBuf::from("/data/profile/browser-data"),
            download_dir: PathBuf::from("/data/profile/downloads"),
            startup_urls: vec![],
            proxy: None,
            proxy_id: None,
            window_mode: WindowMode::Normal,
            restore_session: false,
            cloak_version: Some("151.0.7922.108.3".into()),
            host_screen_width: Some(1920),
            host_screen_height: Some(1080),
            device,
        };

        let spec = builder.build(&config, "instance-1".into()).unwrap();
        let platform_arg = format!("--fingerprint-platform={}", host_platform().as_str());
        assert!(spec.args.iter().any(|arg| arg == &platform_arg));
        assert!(spec
            .args
            .iter()
            .any(|arg| arg == "--fingerprint-gpu-vendor=Google Inc. (NVIDIA)"));
        assert!(spec.args.iter().any(|arg| arg == "--window-size=1920,1080"));
        if host_platform() == DevicePlatform::Windows {
            assert!(spec
                .args
                .iter()
                .any(|arg| arg == "--fingerprint-taskbar-height=48"));
        } else if host_platform() == DevicePlatform::Macos {
            assert!(spec
                .args
                .iter()
                .any(|arg| arg == "--fingerprint-taskbar-height=95"));
        }
        assert!(!spec.args.iter().any(|arg| arg == "--start-maximized"));
    }
}
