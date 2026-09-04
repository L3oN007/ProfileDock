/// CloakBrowser gates `--start-maximized` on binaries at or above this version.
/// Below it, maximized windows can make `outerWidth < innerWidth` (VM tell).
pub const MAXIMIZED_WINDOW_MIN_VERSION: &str = "148.0.7778.215.4";

pub fn version_at_least(current: Option<&str>, minimum: &str) -> bool {
    let Some(current) = current else {
        return false;
    };
    !version_newer(minimum, current)
}

/// Returns true when `left` is strictly newer than `right`.
pub fn version_newer(left: &str, right: &str) -> bool {
    let left_parts = parse_version(left);
    let right_parts = parse_version(right);
    if left_parts.iter().any(|part| part.is_none()) || right_parts.iter().any(|part| part.is_none())
    {
        return false;
    }
    let max_len = left_parts.len().max(right_parts.len());
    for index in 0..max_len {
        let left_value = left_parts.get(index).and_then(|value| *value).unwrap_or(0);
        let right_value = right_parts.get(index).and_then(|value| *value).unwrap_or(0);
        if left_value > right_value {
            return true;
        }
        if left_value < right_value {
            return false;
        }
    }
    false
}

fn parse_version(version: &str) -> Vec<Option<u32>> {
    version
        .split('.')
        .map(|part| part.parse().ok())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn version_at_least_handles_cloak_build_numbers() {
        assert!(version_at_least(
            Some("148.0.7778.215.4"),
            MAXIMIZED_WINDOW_MIN_VERSION
        ));
        assert!(version_at_least(
            Some("151.0.7922.108.3"),
            MAXIMIZED_WINDOW_MIN_VERSION
        ));
        assert!(!version_at_least(
            Some("146.0.7680.177.5"),
            MAXIMIZED_WINDOW_MIN_VERSION
        ));
    }
}
