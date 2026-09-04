use std::time::Duration;

use async_trait::async_trait;
use chrono::Utc;
use reqwest::Proxy;
use tracing::info;

use crate::domain::proxy::{ProxyCheckResult, ProxyProtocol, ResolvedProxy};
use crate::error::AppError;

const CHECK_URL: &str = "https://api.ipify.org?format=json";
const CONNECT_TIMEOUT: Duration = Duration::from_secs(5);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(10);

#[async_trait]
pub trait ProxyChecker: Send + Sync {
    async fn check(&self, proxy: &ResolvedProxy) -> Result<ProxyCheckResult, AppError>;
}

pub struct HttpProxyChecker;

#[async_trait]
impl ProxyChecker for HttpProxyChecker {
    async fn check(&self, proxy: &ResolvedProxy) -> Result<ProxyCheckResult, AppError> {
        let started = Utc::now();
        info!(
            protocol = proxy.protocol.as_str(),
            host = proxy.host.as_str(),
            port = proxy.port,
            auth = proxy.username.is_some(),
            "proxy connectivity check started"
        );

        let proxy_url = build_proxy_url(proxy)?;
        let reqwest_proxy = Proxy::all(&proxy_url).map_err(|_| {
            AppError::ProxyInvalidHost(proxy.host.clone())
        })?;

        let client = reqwest::Client::builder()
            .proxy(reqwest_proxy)
            .connect_timeout(CONNECT_TIMEOUT)
            .timeout(REQUEST_TIMEOUT)
            .build()
            .map_err(|error| AppError::ProxyConnectionFailed(error.to_string()))?;

        let response = match client.get(CHECK_URL).send().await {
            Ok(response) => response,
            Err(error) => {
                if error.is_timeout() {
                    return Ok(ProxyCheckResult {
                        success: false,
                        latency_ms: None,
                        observed_ip: None,
                        error_code: Some("PROXY_CONNECTION_TIMEOUT".into()),
                        error_message: Some("connection timed out".into()),
                    });
                }

                let message = error.to_string();
                let code = if message.to_ascii_lowercase().contains("auth") {
                    "PROXY_AUTH_FAILED"
                } else {
                    "PROXY_CONNECTION_FAILED"
                };

                return Ok(ProxyCheckResult {
                    success: false,
                    latency_ms: elapsed_ms(started),
                    observed_ip: None,
                    error_code: Some(code.into()),
                    error_message: Some(message),
                });
            }
        };

        if !response.status().is_success() {
            return Ok(ProxyCheckResult {
                success: false,
                latency_ms: elapsed_ms(started),
                observed_ip: None,
                error_code: Some("PROXY_CONNECTION_FAILED".into()),
                error_message: Some(format!("unexpected status {}", response.status())),
            });
        }

        let body = response
            .json::<IpifyResponse>()
            .await
            .map_err(|error| AppError::ProxyConnectionFailed(error.to_string()))?;

        Ok(ProxyCheckResult {
            success: true,
            latency_ms: elapsed_ms(started),
            observed_ip: Some(body.ip),
            error_code: None,
            error_message: None,
        })
    }
}

fn build_proxy_url(proxy: &ResolvedProxy) -> Result<String, AppError> {
    let scheme = proxy.protocol.proxy_scheme();
    if let (Some(username), Some(password)) = (&proxy.username, &proxy.password) {
        Ok(format!(
            "{scheme}://{username}:{password}@{host}:{port}",
            host = proxy.host,
            port = proxy.port
        ))
    } else if proxy.username.is_some() || proxy.password.is_some() {
        Err(AppError::InvalidConfiguration(
            "proxy username and password must both be provided".into(),
        ))
    } else {
        Ok(format!("{scheme}://{host}:{port}", host = proxy.host, port = proxy.port))
    }
}

fn elapsed_ms(started: chrono::DateTime<Utc>) -> Option<u64> {
    let elapsed = Utc::now().signed_duration_since(started);
    elapsed.num_milliseconds().try_into().ok()
}

#[derive(serde::Deserialize)]
struct IpifyResponse {
    ip: String,
}

pub fn validate_host(host: &str) -> Result<(), AppError> {
    let trimmed = host.trim();
    if trimmed.is_empty() || trimmed.len() > 253 {
        return Err(AppError::ProxyInvalidHost(trimmed.to_string()));
    }
    Ok(())
}

pub fn validate_port(port: u16) -> Result<(), AppError> {
    if port == 0 {
        return Err(AppError::ProxyInvalidPort(port));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rejects_invalid_port() {
        assert!(matches!(
            validate_port(0),
            Err(AppError::ProxyInvalidPort(0))
        ));
    }

    #[test]
    fn rejects_mismatched_auth_fields() {
        assert!(validate_proxy_input("http", "proxy.example.com", 8080, Some("user"), None).is_err());
    }

    #[test]
    fn accepts_valid_proxy_input() {
        let protocol = validate_proxy_input("socks5", "proxy.example.com", 1080, None, None);
        assert!(protocol.is_ok());
    }
}

pub fn validate_proxy_input(
    protocol: &str,
    host: &str,
    port: u16,
    username: Option<&str>,
    password: Option<&str>,
) -> Result<ProxyProtocol, AppError> {
    let protocol = crate::domain::proxy::parse_protocol(protocol)?;
    validate_host(host)?;
    validate_port(port)?;

    let has_username = username.map(str::trim).is_some_and(|v| !v.is_empty());
    let has_password = password.map(str::trim).is_some_and(|v| !v.is_empty());

    if has_username != has_password {
        return Err(AppError::InvalidConfiguration(
            "proxy username and password must both be provided".into(),
        ));
    }

    Ok(protocol)
}
