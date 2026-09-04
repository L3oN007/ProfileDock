use std::time::Duration;

use reqwest::Proxy;

use crate::domain::proxy::ResolvedBrowserProxy;
use crate::error::AppError;

#[derive(Debug, Clone)]
pub struct GeoIpProfile {
    pub timezone: String,
    pub locale: String,
}

pub async fn resolve_direct() -> Result<GeoIpProfile, AppError> {
    let client = reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(5))
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|error| AppError::NetworkLookupFailed(error.to_string()))?;

    let response = client
        .get("http://ip-api.com/json/?fields=status,timezone,countryCode")
        .send()
        .await
        .map_err(|error| AppError::NetworkLookupFailed(error.to_string()))?;

    parse_ip_api_response(response).await
}

pub async fn resolve_through_proxy(proxy: &ResolvedBrowserProxy) -> Result<GeoIpProfile, AppError> {
    let proxy_url = build_proxy_url(proxy)?;
    let reqwest_proxy =
        Proxy::all(&proxy_url).map_err(|_| AppError::ProxyInvalidHost(proxy.host.clone()))?;

    let client = reqwest::Client::builder()
        .proxy(reqwest_proxy)
        .connect_timeout(Duration::from_secs(5))
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|error| AppError::NetworkLookupFailed(error.to_string()))?;

    let response = client
        .get("http://ip-api.com/json/?fields=status,timezone,countryCode")
        .send()
        .await
        .map_err(|error| AppError::NetworkLookupFailed(error.to_string()))?;

    parse_ip_api_response(response).await
}

async fn parse_ip_api_response(
    response: reqwest::Response,
) -> Result<GeoIpProfile, AppError> {
    let body = response
        .json::<IpApiResponse>()
        .await
        .map_err(|error| AppError::NetworkLookupFailed(error.to_string()))?;

    if body.status != "success" {
        return Err(AppError::NetworkLookupFailed(
            "geoip lookup failed".into(),
        ));
    }

    let timezone = body
        .timezone
        .ok_or_else(|| AppError::NetworkLookupFailed("geoip timezone missing".into()))?;
    let country_code = body
        .country_code
        .ok_or_else(|| AppError::NetworkLookupFailed("geoip country code missing".into()))?;

    Ok(GeoIpProfile {
        timezone,
        locale: country_code_to_locale(&country_code),
    })
}

fn country_code_to_locale(country_code: &str) -> String {
    match country_code.to_ascii_uppercase().as_str() {
        "US" => "en-US".to_string(),
        "GB" => "en-GB".to_string(),
        "VN" => "vi-VN".to_string(),
        "JP" => "ja-JP".to_string(),
        "DE" => "de-DE".to_string(),
        "FR" => "fr-FR".to_string(),
        other if other.len() == 2 => format!("{}-{}", "en", other),
        _ => "en-US".to_string(),
    }
}

fn build_proxy_url(proxy: &ResolvedBrowserProxy) -> Result<String, AppError> {
    let scheme = proxy.protocol.proxy_scheme();
    if let (Some(username), Some(password)) = (&proxy.username, &proxy.password) {
        Ok(format!(
            "{scheme}://{username}:{password}@{host}:{port}",
            host = proxy.host,
            port = proxy.port
        ))
    } else {
        Ok(format!(
            "{scheme}://{host}:{port}",
            host = proxy.host,
            port = proxy.port
        ))
    }
}

#[derive(serde::Deserialize)]
struct IpApiResponse {
    status: String,
    timezone: Option<String>,
    #[serde(rename = "countryCode")]
    country_code: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_common_country_codes_to_locale() {
        assert_eq!(country_code_to_locale("vn"), "vi-VN");
        assert_eq!(country_code_to_locale("US"), "en-US");
    }
}
