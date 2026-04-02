#![allow(non_snake_case)]

use tauri::Manager;

mod auth;
mod coding_plan;
mod config;
mod copilot;
mod deeplink;
mod env;
mod failover;
mod global_proxy;
mod import_export;
mod mcp;
mod misc;
mod model_fetch;
mod omo;
mod openclaw;
mod plugin;
mod prompt;
mod provider;
mod proxy;
mod session_manager;
mod settings;
pub mod skill;
mod stream_check;
mod subscription;
mod sync_support;

mod lightweight;
mod usage;
mod webdav_sync;
mod workspace;
pub mod zenmux;

pub use auth::*;
pub use coding_plan::*;
pub use config::*;
pub use copilot::*;
pub use deeplink::*;
pub use env::*;
pub use failover::*;
pub use global_proxy::*;
pub use import_export::*;
pub use mcp::*;
pub use misc::*;
pub use model_fetch::*;
pub use omo::*;
pub use openclaw::*;
pub use plugin::*;
pub use prompt::*;
pub use provider::*;
pub use proxy::*;
pub use session_manager::*;
pub use settings::*;
pub use skill::*;
pub use stream_check::*;
pub use subscription::*;

pub use lightweight::*;
pub use usage::*;
pub use webdav_sync::*;
pub use workspace::*;

#[tauri::command]
pub fn quit_app(app: tauri::AppHandle) {
    log::info!("Quit requested from tray popup");
    app.exit(0);
}

#[tauri::command]
pub fn show_main_window(app: tauri::AppHandle) -> Result<(), String> {
    log::info!("Showing main window from tray popup");

    if let Some(window) = app.get_webview_window("main") {
        #[cfg(target_os = "windows")]
        {
            let _ = window.set_skip_taskbar(false);
        }
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        #[cfg(target_os = "macos")]
        {
            use tauri::ActivationPolicy;
            let _ = app.set_activation_policy(ActivationPolicy::Regular);
        }
        Ok(())
    } else {
        Err("Main window not found".to_string())
    }
}
