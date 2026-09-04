use std::fs::{self, File};
use std::io::{copy, Read};
use std::path::{Component, Path, PathBuf};

use flate2::read::GzDecoder;
use tar::Archive;
use zip::ZipArchive;

use crate::error::AppError;
use crate::infrastructure::cloak::discovery::executable_path_for_root;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ArchiveFormat {
    Zip,
    TarGz,
}

fn detect_archive_format(archive_path: &Path) -> Result<ArchiveFormat, AppError> {
    let file_name = archive_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();

    let normalized = file_name.strip_suffix(".part").unwrap_or(&file_name);

    if normalized.ends_with(".zip") {
        return Ok(ArchiveFormat::Zip);
    }
    if normalized.ends_with(".tar.gz") || normalized.ends_with(".tgz") {
        return Ok(ArchiveFormat::TarGz);
    }

    let mut file = File::open(archive_path)?;
    let mut header = [0u8; 4];
    let read = file
        .read(&mut header)
        .map_err(|error| AppError::CloakArchiveInvalid(error.to_string()))?;

    if read >= 2 && header[0] == 0x1f && header[1] == 0x8b {
        return Ok(ArchiveFormat::TarGz);
    }
    if read >= 2 && header[0] == 0x50 && header[1] == 0x4b {
        return Ok(ArchiveFormat::Zip);
    }

    Err(AppError::CloakArchiveInvalid(format!(
        "unsupported archive format: {}",
        archive_path.display()
    )))
}

pub fn extract_archive(archive_path: &Path, dest_dir: &Path) -> Result<(), AppError> {
    if dest_dir.exists() {
        fs::remove_dir_all(dest_dir)?;
    }
    fs::create_dir_all(dest_dir)?;

    match detect_archive_format(archive_path)? {
        ArchiveFormat::Zip => extract_zip(archive_path, dest_dir)?,
        ArchiveFormat::TarGz => extract_tar_gz(archive_path, dest_dir)?,
    }

    flatten_single_subdir(dest_dir)?;
    make_executable(executable_path_for_root(dest_dir).as_path())?;
    Ok(())
}

fn extract_zip(archive_path: &Path, dest_dir: &Path) -> Result<(), AppError> {
    let file = File::open(archive_path)?;
    let mut archive =
        ZipArchive::new(file).map_err(|error| AppError::CloakArchiveInvalid(error.to_string()))?;

    for index in 0..archive.len() {
        let mut entry = archive
            .by_index(index)
            .map_err(|error| AppError::CloakArchiveInvalid(error.to_string()))?;
        let Some(safe_path) = sanitize_archive_path(entry.name()) else {
            continue;
        };
        let output_path = dest_dir.join(&safe_path);
        if entry.name().ends_with('/') {
            fs::create_dir_all(&output_path)?;
            continue;
        }
        if let Some(parent) = output_path.parent() {
            fs::create_dir_all(parent)?;
        }
        let mut output = File::create(&output_path)?;
        copy(&mut entry, &mut output)?;
    }

    Ok(())
}

fn extract_tar_gz(archive_path: &Path, dest_dir: &Path) -> Result<(), AppError> {
    let file = File::open(archive_path)?;
    let decoder = GzDecoder::new(file);
    let mut archive = Archive::new(decoder);

    for entry in archive
        .entries()
        .map_err(|error| AppError::CloakArchiveInvalid(error.to_string()))?
    {
        let mut entry = entry.map_err(|error| AppError::CloakArchiveInvalid(error.to_string()))?;
        let path = entry
            .path()
            .map_err(|error| AppError::CloakArchiveInvalid(error.to_string()))?;
        let Some(safe_path) = sanitize_archive_path(path.to_string_lossy().as_ref()) else {
            continue;
        };
        let output_path = dest_dir.join(&safe_path);
        if entry.header().entry_type().is_dir() {
            fs::create_dir_all(&output_path)?;
            continue;
        }
        if let Some(parent) = output_path.parent() {
            fs::create_dir_all(parent)?;
        }
        entry
            .unpack(&output_path)
            .map_err(|error| AppError::CloakExtractionFailed(error.to_string()))?;
    }

    Ok(())
}

pub fn sanitize_archive_path(path: &str) -> Option<PathBuf> {
    let mut safe = PathBuf::new();
    for component in Path::new(path).components() {
        match component {
            Component::Normal(part) => safe.push(part),
            Component::CurDir => {}
            _ => return None,
        }
    }
    if safe.as_os_str().is_empty() {
        None
    } else {
        Some(safe)
    }
}

fn flatten_single_subdir(dest_dir: &Path) -> Result<(), AppError> {
    let mut entries = fs::read_dir(dest_dir)?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .collect::<Vec<_>>();

    if entries.len() != 1 || !entries[0].is_dir() {
        return Ok(());
    }

    let subdir = entries.remove(0);
    if subdir
        .file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name.ends_with(".app"))
    {
        return Ok(());
    }

    for child in fs::read_dir(&subdir)? {
        let child = child?;
        let target = dest_dir.join(child.file_name());
        fs::rename(child.path(), target)?;
    }
    fs::remove_dir(subdir)?;
    Ok(())
}

fn make_executable(path: &Path) -> Result<(), AppError> {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if path.exists() {
            let mut permissions = fs::metadata(path)?.permissions();
            permissions.set_mode(permissions.mode() | 0o111);
            fs::set_permissions(path, permissions)?;
        }
    }
    let _ = path;
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::io::Write;

    use super::*;
    use zip::write::SimpleFileOptions;
    use zip::ZipWriter;

    #[test]
    fn sanitize_rejects_traversal() {
        assert!(sanitize_archive_path("../secret.txt").is_none());
        assert!(sanitize_archive_path("/etc/passwd").is_none());
        assert_eq!(
            sanitize_archive_path("chrome").map(|path| path.to_string_lossy().into_owned()),
            Some("chrome".to_string())
        );
    }

    #[test]
    fn detect_archive_format_handles_part_suffix() {
        assert_eq!(
            detect_archive_format(Path::new("cloakbrowser-windows-x64.zip.part")).unwrap(),
            ArchiveFormat::Zip
        );
        assert_eq!(
            detect_archive_format(Path::new("cloakbrowser-linux-x64.tar.gz.part")).unwrap(),
            ArchiveFormat::TarGz
        );
    }

    #[test]
    fn extract_archive_handles_zip_part_suffix() {
        let temp = std::env::temp_dir().join(format!(
            "profiledock-zip-part-test-{}",
            uuid::Uuid::new_v4()
        ));
        let archive_path = temp.join("cloakbrowser-windows-x64.zip.part");
        let dest_dir = temp.join("out");
        fs::create_dir_all(&temp).unwrap();

        {
            let file = File::create(&archive_path).unwrap();
            let mut writer = ZipWriter::new(file);
            writer
                .start_file("chrome.exe", SimpleFileOptions::default())
                .unwrap();
            writer.write_all(b"ok").unwrap();
            writer.finish().unwrap();
        }

        extract_archive(&archive_path, &dest_dir).unwrap();
        assert!(dest_dir.join("chrome.exe").exists());

        let _ = fs::remove_dir_all(&temp);
    }

    #[test]
    fn extract_zip_rejects_traversal_entries() {
        let temp =
            std::env::temp_dir().join(format!("profiledock-zip-test-{}", uuid::Uuid::new_v4()));
        let archive_path = temp.join("bad.zip");
        let dest_dir = temp.join("out");
        fs::create_dir_all(&temp).unwrap();

        {
            let file = File::create(&archive_path).unwrap();
            let mut writer = ZipWriter::new(file);
            writer
                .start_file("../escape.txt", SimpleFileOptions::default())
                .unwrap();
            writer.write_all(b"bad").unwrap();
            writer
                .start_file("chrome", SimpleFileOptions::default())
                .unwrap();
            writer.write_all(b"ok").unwrap();
            writer.finish().unwrap();
        }

        extract_zip(&archive_path, &dest_dir).unwrap();
        assert!(dest_dir.join("chrome").exists());
        assert!(!dest_dir.parent().unwrap().join("escape.txt").exists());

        let _ = fs::remove_dir_all(&temp);
    }
}
