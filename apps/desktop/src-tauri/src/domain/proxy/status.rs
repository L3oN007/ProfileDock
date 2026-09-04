use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};

use super::entity::ProxyCheckRecord;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProxyHealthStatus {
    Unknown,
    Healthy,
    Unhealthy,
}

const HEALTHY_THRESHOLD_MINUTES: i64 = 10;

impl ProxyHealthStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Unknown => "unknown",
            Self::Healthy => "healthy",
            Self::Unhealthy => "unhealthy",
        }
    }

    pub fn from_latest_check(check: Option<&ProxyCheckRecord>) -> Self {
        let Some(check) = check else {
            return Self::Unknown;
        };

        let age = Utc::now().signed_duration_since(check.checked_at);

        if check.success && age <= Duration::minutes(HEALTHY_THRESHOLD_MINUTES) {
            Self::Healthy
        } else if !check.success {
            Self::Unhealthy
        } else {
            Self::Unknown
        }
    }
}
