use super::platform::DevicePlatform;

#[derive(Debug, Clone)]
pub struct HardwarePreset {
    pub id: &'static str,
    pub label: &'static str,
    pub platform: DevicePlatform,
    pub hardware_concurrency: u8,
    pub device_memory_gb: u8,
    pub screen_width: u32,
    pub screen_height: u32,
    pub gpu_vendor: &'static str,
    pub gpu_renderer: &'static str,
}

pub const HARDWARE_PRESETS: &[HardwarePreset] = &[
    HardwarePreset {
        id: "windows-intel-desktop",
        label: "Windows Desktop — Intel",
        platform: DevicePlatform::Windows,
        hardware_concurrency: 8,
        device_memory_gb: 8,
        screen_width: 1920,
        screen_height: 1080,
        gpu_vendor: "Google Inc. (Intel)",
        gpu_renderer: "ANGLE (Intel, Intel(R) UHD Graphics Direct3D11 vs_5_0 ps_5_0)",
    },
    HardwarePreset {
        id: "windows-nvidia-desktop",
        label: "Windows Desktop — NVIDIA",
        platform: DevicePlatform::Windows,
        hardware_concurrency: 8,
        device_memory_gb: 16,
        screen_width: 1920,
        screen_height: 1080,
        gpu_vendor: "Google Inc. (NVIDIA)",
        gpu_renderer: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0)",
    },
    HardwarePreset {
        id: "windows-laptop-intel",
        label: "Windows Laptop — Intel",
        platform: DevicePlatform::Windows,
        hardware_concurrency: 4,
        device_memory_gb: 8,
        screen_width: 1366,
        screen_height: 768,
        gpu_vendor: "Google Inc. (Intel)",
        gpu_renderer: "ANGLE (Intel, Intel(R) Iris Xe Graphics Direct3D11 vs_5_0 ps_5_0)",
    },
    HardwarePreset {
        id: "macos-apple-silicon",
        label: "macOS — Apple Silicon",
        platform: DevicePlatform::Macos,
        hardware_concurrency: 8,
        device_memory_gb: 16,
        screen_width: 2560,
        screen_height: 1600,
        gpu_vendor: "Apple Inc.",
        gpu_renderer: "Apple M1",
    },
    HardwarePreset {
        id: "linux-generic",
        label: "Linux Desktop — Generic",
        platform: DevicePlatform::Linux,
        hardware_concurrency: 8,
        device_memory_gb: 8,
        screen_width: 1920,
        screen_height: 1080,
        gpu_vendor: "Google Inc. (Intel)",
        gpu_renderer: "ANGLE (Intel, Mesa Intel(R) UHD Graphics 620 (KBL GT2))",
    },
];

pub fn find_preset(id: &str) -> Option<&'static HardwarePreset> {
    HARDWARE_PRESETS.iter().find(|preset| preset.id == id)
}
