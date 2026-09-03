use std::collections::HashMap;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ProcessType {
    Browser,
    Worker,
    Sidecar,
}

#[derive(Debug, Clone, Serialize)]
pub struct ManagedProcess {
    pub id: String,
    pub pid: u32,
    pub process_type: ProcessType,
}

struct ProcessEntry {
    child: Child,
    process_type: ProcessType,
}

#[derive(Clone, Default)]
pub struct ProcessManager {
    inner: Arc<Mutex<HashMap<String, ProcessEntry>>>,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn spawn(
        &self,
        executable: &str,
        args: &[String],
        process_type: ProcessType,
    ) -> Result<ManagedProcess, AppError> {
        let mut child = Command::new(executable)
            .args(args)
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|error| AppError::ProcessLaunchFailed(error.to_string()))?;

        let pid = child.id();
        let id = Uuid::new_v4().to_string();

        let managed = ManagedProcess {
            id: id.clone(),
            pid,
            process_type: process_type.clone(),
        };

        let mut processes = self
            .inner
            .lock()
            .map_err(|_| AppError::ProcessLaunchFailed("process manager lock poisoned".into()))?;

        processes.insert(
            id,
            ProcessEntry {
                child,
                process_type,
            },
        );

        Ok(managed)
    }

    pub fn kill(&self, id: &str) -> Result<(), AppError> {
        let mut processes = self
            .inner
            .lock()
            .map_err(|_| AppError::ProcessNotFound(id.to_string()))?;

        let entry = processes
            .remove(id)
            .ok_or_else(|| AppError::ProcessNotFound(id.to_string()))?;

        entry
            .child
            .kill()
            .map_err(|error| AppError::ProcessLaunchFailed(error.to_string()))?;

        Ok(())
    }

    pub fn is_running(&self, id: &str) -> Result<bool, AppError> {
        let mut processes = self
            .inner
            .lock()
            .map_err(|_| AppError::ProcessNotFound(id.to_string()))?;

        let Some(entry) = processes.get_mut(id) else {
            return Ok(false);
        };

        match entry.child.try_wait() {
            Ok(Some(_)) => {
                processes.remove(id);
                Ok(false)
            }
            Ok(None) => Ok(true),
            Err(error) => Err(AppError::ProcessLaunchFailed(error.to_string())),
        }
    }

    pub fn get_pid(&self, id: &str) -> Result<Option<u32>, AppError> {
        let mut processes = self
            .inner
            .lock()
            .map_err(|_| AppError::ProcessNotFound(id.to_string()))?;

        let Some(entry) = processes.get_mut(id) else {
            return Ok(None);
        };

        match entry.child.try_wait() {
            Ok(Some(_)) => {
                processes.remove(id);
                Ok(None)
            }
            Ok(None) => Ok(Some(entry.child.id())),
            Err(error) => Err(AppError::ProcessLaunchFailed(error.to_string())),
        }
    }

    pub fn list_managed(&self) -> Result<Vec<ManagedProcess>, AppError> {
        let mut processes = self
            .inner
            .lock()
            .map_err(|_| AppError::ProcessLaunchFailed("process manager lock poisoned".into()))?;

        let mut managed = Vec::new();
        let mut stale = Vec::new();

        for (id, entry) in processes.iter_mut() {
            match entry.child.try_wait() {
                Ok(Some(_)) => stale.push(id.clone()),
                Ok(None) => managed.push(ManagedProcess {
                    id: id.clone(),
                    pid: entry.child.id(),
                    process_type: entry.process_type.clone(),
                }),
                Err(error) => return Err(AppError::ProcessLaunchFailed(error.to_string())),
            }
        }

        for id in stale {
            processes.remove(&id);
        }

        Ok(managed)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn spawn_and_kill_process() {
        let manager = ProcessManager::new();
        let managed = manager
            .spawn("sleep", &["10".to_string()], ProcessType::Worker)
            .expect("spawn sleep");

        assert!(manager.is_running(&managed.id).unwrap());
        assert_eq!(manager.get_pid(&managed.id).unwrap(), Some(managed.pid));

        manager.kill(&managed.id).expect("kill process");
        assert!(!manager.is_running(&managed.id).unwrap());
    }

    #[test]
    fn list_managed_processes() {
        let manager = ProcessManager::new();
        let managed = manager
            .spawn("sleep", &["10".to_string()], ProcessType::Browser)
            .expect("spawn sleep");

        let listed = manager.list_managed().expect("list managed");
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].id, managed.id);

        manager.kill(&managed.id).expect("kill process");
        assert!(manager.list_managed().unwrap().is_empty());
    }
}
