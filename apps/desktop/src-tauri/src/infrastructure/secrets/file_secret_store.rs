use std::fs;
use std::path::PathBuf;

use crate::error::AppError;
use crate::infrastructure::secrets::secret_store::SecretStore;

pub struct FileSecretStore {
    root: PathBuf,
}

impl FileSecretStore {
    pub fn new(root: PathBuf) -> Result<Self, AppError> {
        fs::create_dir_all(&root)?;
        Ok(Self { root })
    }

    fn path_for(&self, key: &str) -> PathBuf {
        let safe_key = key.replace('/', "__");
        self.root.join(safe_key)
    }
}

impl SecretStore for FileSecretStore {
    fn set(&self, key: &str, value: &str) -> Result<(), AppError> {
        let path = self.path_for(key);
        fs::write(&path, value)?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&path)?.permissions();
            perms.set_mode(0o600);
            fs::set_permissions(&path, perms)?;
        }

        Ok(())
    }

    fn get(&self, key: &str) -> Result<Option<String>, AppError> {
        let path = self.path_for(key);
        if !path.exists() {
            return Ok(None);
        }
        Ok(Some(fs::read_to_string(path)?))
    }

    fn delete(&self, key: &str) -> Result<(), AppError> {
        let path = self.path_for(key);
        if path.exists() {
            fs::remove_file(path)?;
        }
        Ok(())
    }
}
