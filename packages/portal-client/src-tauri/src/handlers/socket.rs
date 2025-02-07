use crate::PortalState;
use crate::state::PortalConfig;
use tokio::net::UdpSocket;
use serde::Deserialize;
use tauri::State;

#[derive(Debug, Deserialize)]
pub struct SocketConfig {
    pub bind_port: u16,
    pub udp_port: u16,
}

pub async fn initialize_socket_inner_old(state: &PortalState) -> Result<(), String> {
    let mut socket_guard = state.socket.lock().await;
    if socket_guard.is_some() {
        return Ok(());
    }

    println!("Initializing UDP socket for Portal Network...");
    let socket = UdpSocket::bind("0.0.0.0:0").await.map_err(|e| {
            println!("Failed to bind socket: {}", e);
            e.to_string()
        })?;

    println!("Socket bound successfully to {}", socket.local_addr().map_err(|e| e.to_string())?);
    *socket_guard = Some(socket);
    Ok(())
}

pub async fn initialize_socket_inner(
    state: &PortalState,
    config: SocketConfig,
) -> Result<(), String> {
    let mut socket_guard = state.socket.lock().await;
    if socket_guard.is_some() {
        return Ok(());
    }

    let mut config_guard = state.config.lock().await;
    *config_guard = Some(PortalConfig {
        bind_port: config.bind_port,
        udp_port: config.udp_port,
    });

    println!("Initializing UDP socket for Portal Network on port {}...", config.udp_port);
    let socket = UdpSocket::bind(format!("0.0.0.0:{}", config.udp_port))
        .await
        .map_err(|e| {
            println!("Failed to bind socket: {}", e);
            e.to_string()
        })?;

    println!("Socket bound successfully to {}", socket.local_addr().map_err(|e| e.to_string())?);
    *socket_guard = Some(socket);
    Ok(())
}

#[tauri::command]
pub async fn initialize_socket(
    state: State<'_, PortalState>,
    config: SocketConfig,
) -> Result<(), String> {
    initialize_socket_inner(&state, config).await
}