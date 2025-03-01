mod state;
mod handlers;
mod network;
mod types;
mod portal_process;

pub use state::PortalState;
pub use handlers::*;
use portal_process::setup_portal_process;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_udp::init())
        .setup(|app| {
            tauri::async_runtime::block_on(async {
                setup_portal_process(app).await
            })
        })
        .invoke_handler(tauri::generate_handler![
            handlers::portal::portal_request,
            handlers::portal::initialize_portal,
            handlers::portal::shutdown_portal,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}