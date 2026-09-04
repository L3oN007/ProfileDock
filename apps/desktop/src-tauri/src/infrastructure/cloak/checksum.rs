use std::io::Read;
use std::path::Path;

use sha2::{Digest, Sha256};

use crate::error::AppError;

pub fn sha256_file(path: &Path) -> Result<String, AppError> {
    let mut file = std::fs::File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 1024 * 1024];
    loop {
        let read = file.read(&mut buffer)?;
        if read == 0 {
            break;
        }
        hasher.update(&buffer[..read]);
    }
    Ok(hex::encode(hasher.finalize()))
}

pub fn verify_sha256(path: &Path, expected: &str) -> Result<(), AppError> {
    let actual = sha256_file(path)?;
    if actual != expected.to_lowercase() {
        return Err(AppError::CloakChecksumMismatch);
    }
    Ok(())
}
