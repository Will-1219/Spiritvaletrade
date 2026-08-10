mod capture;
mod platform;

use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Shortcut, ShortcutState};

/// Event name the frontend listens on.
const CAPTURE_EVENT: &str = "valetrade://capture";

#[tauri::command]
fn trigger_capture(app: tauri::AppHandle) {
    spawn_capture(app);
}

fn spawn_capture(app: tauri::AppHandle) {
    std::thread::spawn(move || {
        let out_dir = app
            .path()
            .app_data_dir()
            .map(|d| d.join("captures"))
            .unwrap_or_else(|_| std::env::temp_dir().join("valetrade_captures"));
        let result = capture::run_capture(out_dir);
        let _ = app.emit(CAPTURE_EVENT, &result);
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed
                        && shortcut.matches(tauri_plugin_global_shortcut::Modifiers::empty(), Code::F8)
                    {
                        spawn_capture(app.clone());
                    }
                })
                .build(),
        )
        .setup(|app| {
            // register F8 as the global capture hotkey
            let f8: Shortcut = "F8".parse().expect("valid shortcut");
            app.global_shortcut().register(f8)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![trigger_capture])
        .run(tauri::generate_context!())
        .expect("error while running ValeTrade Companion");
}
