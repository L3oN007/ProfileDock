use crate::domain::cloak::{CloakInstallation, CloakLaunchConfig};
use crate::domain::device::WebRtcMode;
use crate::domain::profile::WindowMode;
use crate::error::AppError;
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

        let mut args = vec![
            format!("--user-data-dir={}", config.user_data_dir.to_string_lossy()),
            format!("--download-dir={}", config.download_dir.to_string_lossy()),
            "--no-first-run".to_string(),
            "--no-default-browser-check".to_string(),
        ];

        if !config.restore_session {
            args.push("--no-restore-session".to_string());
        }

        match config.window_mode {
            WindowMode::Normal => {}
            WindowMode::Maximized => args.push("--start-maximized".to_string()),
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
        }

        let device = &config.device;
        args.push(format!("--fingerprint={}", device.fingerprint_seed));
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
        if let Some(width) = device.screen_width {
            args.push(format!("--fingerprint-screen-width={width}"));
        }
        if let Some(height) = device.screen_height {
            args.push(format!("--fingerprint-screen-height={height}"));
        }
        if let Some(vendor) = &device.gpu_vendor {
            args.push(format!("--fingerprint-gpu-vendor={vendor}"));
        }
        if let Some(renderer) = &device.gpu_renderer {
            args.push(format!("--fingerprint-gpu-renderer={renderer}"));
        }
        if let Some(timezone) = &device.timezone {
            args.push(format!("--timezone={timezone}"));
        }
        if let Some(locale) = &device.locale {
            args.push(format!("--locale={locale}"));
        }
        match device.webrtc_mode {
            WebRtcMode::Proxy => args.push("--webrtc-ip=proxy".to_string()),
            WebRtcMode::Real => args.push("--webrtc-ip=real".to_string()),
            WebRtcMode::Disabled => args.push("--webrtc-ip=disabled".to_string()),
        }

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

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use chrono::Utc;

    use std::path::Path;

    use super::*;
    use crate::domain::cloak::CloakCapabilities;
    use crate::domain::device::{DeviceConfigResolver, ProfileDeviceSettings};
    use crate::domain::profile::WindowMode;

    #[test]
    fn build_uses_installation_executable_and_profile_paths() {
        let installation = CloakInstallation {
            executable: PathBuf::from("/usr/bin/cloak-browser"),
            version: Some("1.0.0".into()),
            valid: true,
            last_checked_at: Utc::now(),
        };
        let builder = CloakLaunchBuilder::new(installation);
        let device_settings = ProfileDeviceSettings::defaults("profile-1".into(), Utc::now());
        let device =
            DeviceConfigResolver::resolve(&device_settings, &CloakCapabilities::default(), false);
        let config = CloakLaunchConfig {
            profile_id: "profile-1".into(),
            user_data_dir: PathBuf::from("/data/profile/browser-data"),
            download_dir: PathBuf::from("/data/profile/downloads"),
            startup_urls: vec!["https://example.com".into()],
            proxy: None,
            proxy_id: None,
            window_mode: WindowMode::Maximized,
            restore_session: true,
            cloak_version: Some("1.0.0".into()),
            device,
        };

        let spec = builder.build(&config, "instance-1".into()).unwrap();
        assert_eq!(spec.executable, Path::new("/usr/bin/cloak-browser"));
        assert!(spec.args.iter().any(|arg| arg.contains("user-data-dir")));
        assert!(spec.args.iter().any(|arg| arg.contains("download-dir")));
        assert!(spec.args.iter().any(|arg| arg == "https://example.com"));
        assert!(spec
            .args
            .iter()
            .any(|arg| arg.starts_with("--fingerprint=")));
    }
}
