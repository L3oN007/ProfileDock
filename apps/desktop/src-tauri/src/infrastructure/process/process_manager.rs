use std::collections::HashMap;
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::error::AppError;
use crate::infrastructure::process::ProcessSpec;

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
    pub profile_id: Option<String>,
    pub instance_id: Option<String>,
}

struct ProcessEntry {
    child: Child,
    process_type: ProcessType,
    profile_id: Option<String>,
    instance_id: Option<String>,
}

#[derive(Clone, Default)]
pub struct ProcessManager {
    inner: Arc<Mutex<HashMap<String, ProcessEntry>>>,
}

impl ProcessManager {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn spawn_spec(&self, spec: &ProcessSpec) -> Result<ManagedProcess, AppError> {
        let child = Command::new(&spec.executable)
            .args(&spec.args)
            .current_dir(spec.working_dir.as_deref().unwrap_or_else(|| ".".as_ref()))
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
            process_type: spec.process_type.clone(),
            profile_id: Some(spec.profile_id.clone()),
            instance_id: Some(spec.instance_id.clone()),
        };

        let mut processes = self
            .inner
            .lock()
            .map_err(|_| AppError::ProcessLaunchFailed("process manager lock poisoned".into()))?;

        processes.insert(
            id,
            ProcessEntry {
                child,
                process_type: spec.process_type.clone(),
                profile_id: Some(spec.profile_id.clone()),
                instance_id: Some(spec.instance_id.clone()),
            },
        );

        Ok(managed)
    }

    pub fn terminate(&self, id: &str, graceful_timeout: Duration) -> Result<i32, AppError> {
        let mut processes = self
            .inner
            .lock()
            .map_err(|_| AppError::ProcessNotFound(id.to_string()))?;

        let Some(mut entry) = processes.remove(id) else {
            return Err(AppError::ProcessNotFound(id.to_string()));
        };

        let _ = entry.child.kill();

        let start = std::time::Instant::now();
        loop {
            match entry.child.try_wait() {
                Ok(Some(status)) => return Ok(status.code().unwrap_or(-1)),
                Ok(None) if start.elapsed() < graceful_timeout => {
                    std::thread::sleep(Duration::from_millis(100));
                }
                Ok(None) => {
                    entry
                        .child
                        .kill()
                        .map_err(|error| AppError::ProcessLaunchFailed(error.to_string()))?;
                    match entry.child.wait() {
                        Ok(status) => return Ok(status.code().unwrap_or(-1)),
                        Err(error) => return Err(AppError::ProcessLaunchFailed(error.to_string())),
                    }
                }
                Err(error) => return Err(AppError::ProcessLaunchFailed(error.to_string())),
            }
        }
    }

    #[allow(dead_code)]
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

    pub fn list_by_instance_id(
        &self,
        instance_id: &str,
    ) -> Result<Option<ManagedProcess>, AppError> {
        let mut processes = self
            .inner
            .lock()
            .map_err(|_| AppError::ProcessNotFound(instance_id.to_string()))?;

        let managed_id = processes
            .iter()
            .find(|(_, entry)| entry.instance_id.as_deref() == Some(instance_id))
            .map(|(id, _)| id.clone());

        let Some(id) = managed_id else {
            return Ok(None);
        };

        let Some(entry) = processes.get_mut(&id) else {
            return Ok(None);
        };

        match entry.child.try_wait() {
            Ok(Some(_)) => {
                processes.remove(&id);
                Ok(None)
            }
            Ok(None) => Ok(Some(ManagedProcess {
                id: id.clone(),
                pid: entry.child.id(),
                process_type: entry.process_type.clone(),
                profile_id: entry.profile_id.clone(),
                instance_id: entry.instance_id.clone(),
            })),
            Err(error) => Err(AppError::ProcessLaunchFailed(error.to_string())),
        }
    }

    pub fn poll_exited(&self) -> Result<Vec<ExitedProcess>, AppError> {
        let mut processes = self
            .inner
            .lock()
            .map_err(|_| AppError::ProcessLaunchFailed("process manager lock poisoned".into()))?;

        let mut exited = Vec::new();
        let mut stale = Vec::new();

        for (id, entry) in processes.iter_mut() {
            match entry.child.try_wait() {
                Ok(Some(status)) => {
                    stale.push(id.clone());
                    exited.push(ExitedProcess {
                        managed_id: id.clone(),
                        profile_id: entry.profile_id.clone(),
                        instance_id: entry.instance_id.clone(),
                        exit_code: status.code().unwrap_or(-1),
                    });
                }
                Ok(None) => {}
                Err(error) => return Err(AppError::ProcessLaunchFailed(error.to_string())),
            }
        }

        for id in stale {
            processes.remove(&id);
        }

        Ok(exited)
    }

    pub fn is_pid_alive(pid: u32) -> bool {
        #[cfg(unix)]
        {
            use std::process::Command;
            Command::new("kill")
                .args(["-0", &pid.to_string()])
                .status()
                .map(|status| status.success())
                .unwrap_or(false)
        }
        #[cfg(not(unix))]
        {
            let _ = pid;
            false
        }
    }
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct ExitedProcess {
    pub managed_id: String,
    pub profile_id: Option<String>,
    pub instance_id: Option<String>,
    pub exit_code: i32,
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use super::*;
    use crate::infrastructure::process::ProcessSpec;

    #[test]
    fn spawn_and_terminate_process() {
        let manager = ProcessManager::new();
        let spec = ProcessSpec {
            executable: PathBuf::from("sleep"),
            args: vec!["2".to_string()],
            working_dir: None,
            process_type: ProcessType::Worker,
            profile_id: "test-profile".into(),
            instance_id: "test-instance".into(),
        };

        let managed = manager.spawn_spec(&spec).expect("spawn sleep");
        assert!(manager.is_running(&managed.id).unwrap());

        let code = manager
            .terminate(&managed.id, Duration::from_secs(1))
            .expect("terminate");
        assert!(code == 0 || code == -1);
        assert!(!manager.is_running(&managed.id).unwrap());
    }
}
