use std::time::Duration;

use reqwest::Client;
use serde::Deserialize;

use crate::domain::NetworkInfo;
use crate::error::AppError;

const REQUEST_TIMEOUT: Duration = Duration::from_secs(8);

#[derive(Debug, Deserialize)]
struct IpWhoResponse {
    success: Option<bool>,
    ip: Option<String>,
    country: Option<String>,
    country_code: Option<String>,
    region: Option<String>,
    city: Option<String>,
    connection: Option<IpWhoConnection>,
    latitude: Option<f64>,
    longitude: Option<f64>,
    message: Option<String>,
}

#[derive(Debug, Deserialize)]
struct IpWhoConnection {
    isp: Option<String>,
}

#[derive(Debug, Deserialize)]
struct IpApiCoResponse {
    ip: Option<String>,
    country_name: Option<String>,
    country_code: Option<String>,
    region: Option<String>,
    city: Option<String>,
    org: Option<String>,
    latitude: Option<f64>,
    longitude: Option<f64>,
    error: Option<bool>,
    reason: Option<String>,
}

pub async fn lookup_public_network_info() -> Result<NetworkInfo, AppError> {
    let client = Client::builder()
        .timeout(REQUEST_TIMEOUT)
        .build()
        .map_err(|error| AppError::NetworkLookupFailed(error.to_string()))?;

    match fetch_from_ipwho(&client).await {
        Ok(info) => Ok(info),
        Err(_) => fetch_from_ipapi_co(&client).await,
    }
}

async fn fetch_from_ipwho(client: &Client) -> Result<NetworkInfo, AppError> {
    let response = client
        .get("https://ipwho.is/")
        .send()
        .await
        .map_err(|error| AppError::NetworkLookupFailed(error.to_string()))?;

    if !response.status().is_success() {
        return Err(AppError::NetworkLookupFailed("ipwho request failed".into()));
    }

    let data = response
        .json::<IpWhoResponse>()
        .await
        .map_err(|error| AppError::NetworkLookupFailed(error.to_string()))?;

    if data.success != Some(true) || data.ip.is_none() {
        return Err(AppError::NetworkLookupFailed(
            data.message
                .unwrap_or_else(|| "ipwho returned invalid data".into()),
        ));
    }

    Ok(map_network_info(
        data.ip.unwrap_or_default(),
        data.country.unwrap_or_else(|| "Unknown".into()),
        data.country_code.unwrap_or_else(|| "XX".into()),
        data.region.unwrap_or_default(),
        data.city.unwrap_or_default(),
        data.connection.and_then(|connection| connection.isp),
        data.latitude,
        data.longitude,
    ))
}

async fn fetch_from_ipapi_co(client: &Client) -> Result<NetworkInfo, AppError> {
    let response = client
        .get("https://ipapi.co/json/")
        .send()
        .await
        .map_err(|error| AppError::NetworkLookupFailed(error.to_string()))?;

    if !response.status().is_success() {
        return Err(AppError::NetworkLookupFailed(
            "ipapi.co request failed".into(),
        ));
    }

    let data = response
        .json::<IpApiCoResponse>()
        .await
        .map_err(|error| AppError::NetworkLookupFailed(error.to_string()))?;

    if data.error == Some(true) || data.ip.is_none() {
        return Err(AppError::NetworkLookupFailed(
            data.reason
                .unwrap_or_else(|| "ipapi.co returned invalid data".into()),
        ));
    }

    Ok(map_network_info(
        data.ip.unwrap_or_default(),
        data.country_name.unwrap_or_else(|| "Unknown".into()),
        data.country_code.unwrap_or_else(|| "XX".into()),
        data.region.unwrap_or_default(),
        data.city.unwrap_or_default(),
        data.org,
        data.latitude,
        data.longitude,
    ))
}

fn map_network_info(
    ip: String,
    country: String,
    country_code: String,
    region: String,
    city: String,
    isp: Option<String>,
    latitude: Option<f64>,
    longitude: Option<f64>,
) -> NetworkInfo {
    NetworkInfo {
        ip,
        country,
        country_code: country_code.to_uppercase(),
        region,
        city,
        isp,
        latitude,
        longitude,
    }
}
