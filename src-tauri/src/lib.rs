use std::path::PathBuf;
use std::sync::Mutex;

use tauri::{Emitter, Manager, RunEvent};
use tauri_plugin_fs::FsExt;

struct OpenFileQueue(Mutex<Vec<String>>);

#[tauri::command]
fn take_open_files(queue: tauri::State<'_, OpenFileQueue>) -> Vec<String> {
    let mut guard = queue.0.lock().unwrap_or_else(|e| e.into_inner());
    std::mem::take(&mut *guard)
}

fn enqueue_open_paths(app: &tauri::AppHandle, paths: Vec<PathBuf>) {
    if paths.is_empty() {
        return;
    }

    let fs = app.fs_scope();
    for p in &paths {
        let _ = fs.allow_file(p);
    }

    let strings: Vec<String> = paths
        .into_iter()
        .map(|p| p.to_string_lossy().into_owned())
        .collect();

    {
        let queue = app.state::<OpenFileQueue>();
        let mut guard = queue.0.lock().unwrap_or_else(|e| e.into_inner());
        guard.extend(strings);
    }

    let _ = app.emit("open-files", ());
}

/// Interprets one command-line argument as a file to open, if it is one.
///
/// Windows and Linux hand associated files to the app as plain paths
/// (`C:\Users\me\diagram.mmd`, `/home/me/diagram.mmd`), while some launchers
/// pass `file://` URLs. A bare Windows path parses as a URL whose scheme is the
/// drive letter (`c`), so only genuine `file:` URLs are decoded as URLs; a
/// one-letter scheme is treated as a path and any other scheme (`https:`,
/// `mailto:`, ...) is not a local file and is ignored.
#[cfg(any(target_os = "windows", target_os = "linux", test))]
fn argv_entry_to_path(arg: &str) -> Option<PathBuf> {
    if arg.is_empty() || arg.starts_with('-') {
        return None;
    }

    match url::Url::parse(arg) {
        Ok(url) if url.scheme() == "file" => url.to_file_path().ok(),
        Ok(url) if url.scheme().len() == 1 => Some(PathBuf::from(arg)),
        Ok(_) => None,
        Err(_) => Some(PathBuf::from(arg)),
    }
}

#[cfg(any(target_os = "windows", target_os = "linux", test))]
#[cfg_attr(test, allow(dead_code))]
fn collect_argv_file_paths() -> Vec<PathBuf> {
    std::env::args()
        .skip(1)
        .filter_map(|arg| argv_entry_to_path(&arg))
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(OpenFileQueue(Mutex::new(Vec::new())))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![take_open_files])
        .setup(|app| {
            #[cfg(any(target_os = "windows", target_os = "linux"))]
            {
                let paths = collect_argv_file_paths();
                if !paths.is_empty() {
                    enqueue_open_paths(&app.handle(), paths);
                }
            }
            #[cfg(not(any(target_os = "windows", target_os = "linux")))]
            let _ = app;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            #[cfg(any(target_os = "macos", target_os = "ios"))]
            if let RunEvent::Opened { urls } = event {
                let paths: Vec<PathBuf> = urls
                    .into_iter()
                    .filter_map(|u| u.to_file_path().ok())
                    .collect();
                if !paths.is_empty() {
                    enqueue_open_paths(app, paths);
                }
            }
        });
}

#[cfg(test)]
mod tests {
    use super::argv_entry_to_path;
    use std::path::PathBuf;

    #[test]
    fn windows_drive_letter_path_is_kept_as_a_path() {
        let arg = r"C:\Users\bob\diagram.mmd";
        assert_eq!(argv_entry_to_path(arg), Some(PathBuf::from(arg)));
    }

    #[test]
    fn windows_path_with_spaces_and_lowercase_drive_is_kept() {
        let arg = r"d:\My Diagrams\flow chart.mmd";
        assert_eq!(argv_entry_to_path(arg), Some(PathBuf::from(arg)));
    }

    #[test]
    fn unc_path_is_kept_as_a_path() {
        let arg = r"\\server\share\diagram.mmd";
        assert_eq!(argv_entry_to_path(arg), Some(PathBuf::from(arg)));
    }

    #[test]
    fn unix_absolute_and_relative_paths_are_kept() {
        for arg in [
            "/home/bob/diagram.mmd",
            "diagram.mmd",
            "./nested/diagram.mmd",
        ] {
            assert_eq!(argv_entry_to_path(arg), Some(PathBuf::from(arg)));
        }
    }

    #[test]
    fn file_url_is_decoded_to_a_path() {
        #[cfg(unix)]
        assert_eq!(
            argv_entry_to_path("file:///tmp/diagram.mmd"),
            Some(PathBuf::from("/tmp/diagram.mmd"))
        );
        #[cfg(windows)]
        assert_eq!(
            argv_entry_to_path("file:///C:/Users/bob/diagram.mmd"),
            Some(PathBuf::from(r"C:\Users\bob\diagram.mmd"))
        );
    }

    #[test]
    fn non_file_urls_flags_and_empty_args_are_ignored() {
        for arg in [
            "https://example.com/diagram.mmd",
            "mailto:someone@example.com",
            "--flag",
            "-v",
            "",
        ] {
            assert_eq!(argv_entry_to_path(arg), None, "{arg:?}");
        }
    }
}
