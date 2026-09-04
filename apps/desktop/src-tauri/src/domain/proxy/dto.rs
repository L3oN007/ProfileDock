use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::entity::ProxyCheckRecord;
use super::protocol::ProxyProtocol;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyDto {
    pub id: String,
    pub name: String,
    pub protocol: String,
    pub host: String,
    pub port: u16,
    pub has_auth: bool,
    pub is_enabled: bool,
    pub is_archived: bool,
    pub health_status: String,
    pub last_check: Option<ProxyCheckResultDto>,
    pub assigned_profile_count: u32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyCheckResultDto {
    pub success: bool,
    pub latency_ms: Option<u64>,
    pub observed_ip: Option<String>,
    pub error_code: Option<String>,
    pub checked_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxyAssignmentDto {
    pub profile_id: String,
    pub profile_name: String,
    pub proxy_id: String,
    pub assigned_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProfileProxyAssignmentDto {
    pub profile_id: String,
    pub proxy: Option<ProxySummaryDto>,
    pub assigned_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProxySummaryDto {
    pub id: String,
    pub name: String,
    pub protocol: String,
    pub host: String,
    pub port: u16,
    pub has_auth: bool,
    pub health_status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProxyInput {
    pub name: String,
    pub protocol: String,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProxyInput {
    pub name: Option<String>,
    pub protocol: Option<String>,
    pub host: Option<String>,
    pub port: Option<u16>,
    pub username: Option<String>,
    pub password: Option<CredentialUpdate>,
    pub is_enabled: Option<bool>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "mode", rename_all = "camelCase")]
pub enum CredentialUpdate {
    Keep,
    Replace { value: String },
    Remove,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TestProxyInput {
    pub protocol: String,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ProxyCheckResult {
    pub success: bool,
    pub latency_ms: Option<u64>,
    pub observed_ip: Option<String>,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
}

impl ProxyCheckResult {
    pub fn to_dto(&self, checked_at: DateTime<Utc>) -> ProxyCheckResultDto {
        ProxyCheckResultDto {
            success: self.success,
            latency_ms: self.latency_ms,
            observed_ip: self.observed_ip.clone(),
            error_code: self.error_code.clone(),
            checked_at: checked_at.to_rfc3339(),
        }
    }
}

impl ProxyCheckRecord {
    pub fn to_dto(&self) -> ProxyCheckResultDto {
        ProxyCheckResultDto {
            success: self.success,
            latency_ms: self.latency_ms,
            observed_ip: self.observed_ip.clone(),
            error_code: self.error_code.clone(),
            checked_at: self.checked_at.to_rfc3339(),
        }
    }
}

pub fn parse_protocol(value: &str) -> Result<ProxyProtocol, crate::error::AppError> {
    ProxyProtocol::from_str(value).ok_or_else(|| {
        crate::error::AppError::ProxyInvalidProtocol(value.to_string())
    })
}

pub fn username_secret_key(proxy_id: &str) -> String {
    format!("proxy/{proxy_id}/username")
}

pub fn password_secret_key(proxy_id: &str) -> String {
    format!("proxy/{proxy_id}/password")
}
