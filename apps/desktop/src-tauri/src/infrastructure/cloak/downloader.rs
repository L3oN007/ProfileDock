use std::path::Path;
use std::sync::Arc;

use reqwest::Client;
use tokio::io::AsyncWriteExt;
use tokio::sync::Mutex;

use crate::domain::cloak::CloakInstallProgress;
use crate::error::AppError;

pub struct CloakRuntimeDownloader {
    client: Client,
}

impl CloakRuntimeDownloader {
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .user_agent("ProfileDock/0.1")
                .build()
                .expect("failed to build reqwest client"),
        }
    }

    pub async fn download(
        &self,
        url: &str,
        destination: &Path,
        progress: Arc<Mutex<CloakInstallProgress>>,
        cancel_flag: Arc<std::sync::atomic::AtomicBool>,
        authorization: Option<&str>,
    ) -> Result<(), AppError> {
        if let Some(parent) = destination.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }

        let mut request = self.client.get(url);
        if let Some(token) = authorization {
            request = request.header(reqwest::header::AUTHORIZATION, format!("Bearer {token}"));
        }
        let response = request
            .send()
            .await
            .map_err(|error| AppError::CloakDownloadFailed(error.to_string()))?;

        if !response.status().is_success() {
            return Err(AppError::CloakDownloadFailed(format!(
                "HTTP {}",
                response.status()
            )));
        }

        let total_bytes = response.content_length();
        let mut downloaded_bytes = 0u64;
        let mut file = tokio::fs::File::create(destination).await?;
        let mut stream = response.bytes_stream();

        use futures_util::StreamExt;
        while let Some(chunk) = stream.next().await {
            if cancel_flag.load(std::sync::atomic::Ordering::Relaxed) {
                let _ = tokio::fs::remove_file(destination).await;
                return Err(AppError::CloakDownloadFailed("download cancelled".into()));
            }

            let chunk = chunk.map_err(|error| AppError::CloakDownloadFailed(error.to_string()))?;
            file.write_all(&chunk).await?;
            downloaded_bytes += chunk.len() as u64;

            let percent = total_bytes.map(|total| {
                if total == 0 {
                    0
                } else {
                    ((downloaded_bytes.saturating_mul(100)) / total) as u8
                }
            });

            let mut state = progress.lock().await;
            state.downloaded_bytes = downloaded_bytes;
            state.total_bytes = total_bytes;
            state.percent = percent;
        }

        file.flush().await?;
        Ok(())
    }
}

impl Default for CloakRuntimeDownloader {
    fn default() -> Self {
        Self::new()
    }
}
