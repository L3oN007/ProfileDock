use chrono::{DateTime, Utc};

use super::protocol::ProxyProtocol;

#[derive(Debug, Clone)]
pub struct Proxy {
    pub id: String,
    pub name: String,
    pub protocol: ProxyProtocol,
    pub host: String,
    pub port: u16,
    pub username_ref: Option<String>,
    pub password_ref: Option<String>,
    pub is_enabled: bool,
    pub is_archived: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct ProfileProxyAssignment {
    pub profile_id: String,
    pub proxy_id: String,
    pub assigned_at: DateTime<Utc>,
    #[allow(dead_code)]
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct ProxyCheckRecord {
    pub id: String,
    pub proxy_id: String,
    pub success: bool,
    pub latency_ms: Option<u64>,
    pub observed_ip: Option<String>,
    pub error_code: Option<String>,
    pub error_message: Option<String>,
    pub checked_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
pub struct ResolvedProxy {
    pub protocol: ProxyProtocol,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ResolvedBrowserProxy {
    pub protocol: ProxyProtocol,
    pub host: String,
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
}

impl ResolvedBrowserProxy {
    pub fn from_resolved(proxy: ResolvedProxy) -> Self {
        Self {
            protocol: proxy.protocol,
            host: proxy.host,
            port: proxy.port,
            username: proxy.username,
            password: proxy.password,
        }
    }
}
