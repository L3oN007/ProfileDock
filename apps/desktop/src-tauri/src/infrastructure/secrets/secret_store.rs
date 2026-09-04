use crate::error::AppError;

pub trait SecretStore: Send + Sync {
    fn set(&self, key: &str, value: &str) -> Result<(), AppError>;
    fn get(&self, key: &str) -> Result<Option<String>, AppError>;
    fn delete(&self, key: &str) -> Result<(), AppError>;
}
