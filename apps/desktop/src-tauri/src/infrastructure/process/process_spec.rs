use std::path::PathBuf;

use crate::infrastructure::process::ProcessType;

#[derive(Debug, Clone)]
pub struct ProcessSpec {
    pub executable: PathBuf,
    pub args: Vec<String>,
    pub working_dir: Option<PathBuf>,
    pub process_type: ProcessType,
    pub profile_id: String,
    pub instance_id: String,
}
