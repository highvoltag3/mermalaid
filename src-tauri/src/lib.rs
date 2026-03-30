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

#[cfg(any(target_os = "windows", target_os = "linux"))]
fn collect_argv_file_paths() -> Vec<PathBuf> {
    let mut files = Vec::new();

    for maybe_file in std::env::args().skip(1) {
        if maybe_file.starts_with('-') {
            continue;
        }

        if let Ok(url) = url::Url::parse(&maybe_file) {
            if let Ok(path) = url.to_file_path() {
                files.push(path);
            }
        } else {
            files.push(PathBuf::from(maybe_file));
        }
    }

    files
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(OpenFileQueue(Mutex::new(Vec::new())))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
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
