#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct HostDisplaySize {
    pub width: u32,
    pub height: u32,
}

pub fn primary_display_size() -> Option<HostDisplaySize> {
    #[cfg(target_os = "windows")]
    {
        return windows_primary_display();
    }

    #[cfg(target_os = "linux")]
    {
        return linux_primary_display();
    }

    #[cfg(target_os = "macos")]
    {
        return macos_primary_display();
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        None
    }
}

#[cfg(target_os = "windows")]
fn windows_primary_display() -> Option<HostDisplaySize> {
    use std::ffi::c_int;

    #[link(name = "user32")]
    extern "system" {
        fn GetSystemMetrics(nIndex: c_int) -> c_int;
    }

    const SM_CXSCREEN: c_int = 0;
    const SM_CYSCREEN: c_int = 1;

    let width = unsafe { GetSystemMetrics(SM_CXSCREEN) };
    let height = unsafe { GetSystemMetrics(SM_CYSCREEN) };
    if width <= 0 || height <= 0 {
        return None;
    }

    Some(HostDisplaySize {
        width: width as u32,
        height: height as u32,
    })
}

#[cfg(target_os = "linux")]
fn linux_primary_display() -> Option<HostDisplaySize> {
    let output = std::process::Command::new("xrandr")
        .args(["--current"])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let trimmed = line.trim();
        if !trimmed.contains(" connected primary ") && !trimmed.contains(" connected ") {
            continue;
        }
        let Some(geometry) = trimmed.split_whitespace().find(|part| part.contains('x')) else {
            continue;
        };
        let (width, height) = geometry.split_once('x')?;
        let width = width.parse().ok()?;
        let height = height
            .split('+')
            .next()
            .and_then(|value| value.parse().ok())?;
        if width >= 800 && height >= 600 {
            return Some(HostDisplaySize { width, height });
        }
    }

    None
}

#[cfg(target_os = "macos")]
fn macos_primary_display() -> Option<HostDisplaySize> {
    let output = std::process::Command::new("system_profiler")
        .args(["SPDisplaysDataType"])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let trimmed = line.trim();
        if !trimmed.starts_with("Resolution:") {
            continue;
        }
        let mut parts = trimmed
            .trim_start_matches("Resolution:")
            .split_whitespace()
            .filter_map(|value| value.parse::<u32>().ok());
        let width = parts.next()?;
        let height = parts.next()?;
        return Some(HostDisplaySize { width, height });
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn host_display_size_is_positive_when_present() {
        if let Some(size) = primary_display_size() {
            assert!(size.width >= 800);
            assert!(size.height >= 600);
        }
    }
}
