use crate::network::http::start_http_server;
use crate::PortalState;
use std::path::Path;
use std::process::Command;
use std::sync::Arc;
use tauri::Manager;
use tauri::{App, AppHandle, Runtime};
use tokio::net::UdpSocket;

pub struct PortalProcess {
    child: Option<std::process::Child>,
}

impl PortalProcess {
    pub fn new() -> Self {
        Self { child: None }
    }

    pub fn start(&mut self, bind_port: u16, udp_port: u16) -> Result<(), String> {
        // Ensure we don't have a running process
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
        }

        let binary_path = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join("portal-client.js");

        if !binary_path.exists() {
            return Err(
                "Portal client binary not found. Please ensure the binary is built.".to_string(),
            );
        }

        let child = Command::new("node")
            .arg("--experimental-modules")
            .arg("--no-warnings")
            .arg(binary_path)
            .env("BIND_PORT", bind_port.to_string())
            .env("UDP_PORT", udp_port.to_string())
            .spawn()
            .map_err(|e| format!("Failed to start portal process: {}", e))?;

        self.child = Some(child);
        Ok(())
    }

    pub fn stop(&mut self) -> Result<(), String> {
        if let Some(mut child) = self.child.take() {
            child
                .kill()
                .map_err(|e| format!("Failed to stop portal process: {}", e))?;
        }
        Ok(())
    }
}

impl Drop for PortalProcess {
    fn drop(&mut self) {
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
        }
    }
}

pub async fn setup_portal_process(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    // Initialize the shared state
    let state = Arc::new(PortalState::new());

    // Share state with the app
    app.manage(state.clone());

    let app_handle = app.handle().clone();

    // Start HTTP server for browser support in a separate task
    tauri::async_runtime::spawn(async move {
        start_http_server(app_handle).await;
    });

    // Set up process termination handling
    let state_clone = state.clone();
    let main_window = app
        .get_webview_window("main")
        .ok_or("Main window not found")?;
    main_window.on_window_event(move |event| {
        if let tauri::WindowEvent::Destroyed = event {
            let state = state_clone.clone();
            tauri::async_runtime::block_on(async move {
                // Clean up any running processes
                let mut portal_process = state.portal_process.lock().await;
                if let Some(process) = portal_process.as_mut() {
                    let _ = process.stop();
                }

                // Clean up socket if it exists
                let mut socket = state.socket.lock().await;
                *socket = None;
            });
        }
    });

    Ok(())
}

// pub async fn setup_portal_process(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
//     // Initialize the shared state
//     let state = Arc::new(PortalState::new());

//     // Share state with the app
//     app.manage(state.clone());

//     let app_handle = app.handle().clone();

//     // Start HTTP server for browser support in a separate task
//     tauri::async_runtime::spawn(async move {
//         start_http_server(app_handle).await;
//     });

//     // Set up process termination handling
//     let state_clone = state.clone();
//     let main_window = app.get_webview_window("main").ok_or("Main window not found")?;
//     main_window.on_window_event(move |event| {
//         if let tauri::WindowEvent::Destroyed = event {
//             let state = state_clone.clone();
//             tauri::async_runtime::block_on(async move {
//                 // Clean up any running processes
//                 let mut portal_process = state.portal_process.lock().await;
//                 if let Some(process) = portal_process.as_mut() {
//                     let _ = process.stop();
//                 }

//                 // Clean up socket if it exists
//                 let mut socket = state.socket.lock().await;
//                 *socket = None;
//             });
//         }
//     });

//     Ok(())
// }
