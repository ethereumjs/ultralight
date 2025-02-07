use crate::state::PortalState;
use crate::portal_process::PortalProcess;
use crate::network::udp::{send_bytes, receive_bytes};
use serde_json::{Value, json};
use tauri::State;
use std::str;
use std::sync::Arc;
use tokio::net::UdpSocket;

pub async fn portal_request_inner(
    state: &PortalState,
    method: String,
    params: Value,
) -> Result<Value, String> {
    let config = state.config.lock().await;
    let config = config.as_ref().ok_or("Socket not initialized")?;
    
    println!("Received portal request: method={}, params={:?}", method, params);
    let actual_method = params["method"].as_str()
        .ok_or("Missing 'method' in params")?;
        
    let actual_params = match params["params"].as_array() {
        Some(array) => {
            if array.len() == 1 && array[0].is_array() {
                array[0].as_array()
                    .unwrap_or(&Vec::new())
                    .clone()
            } else {
                array.clone()
            }
        },
        None => Vec::new(),
    };

    let request = json!({
        "jsonrpc": "2.0",
        "method": actual_method,
        "params": actual_params,
        "id": 1,
    });
    
    let request_bytes = serde_json::to_vec(&request)
        .map_err(|e| format!("Failed to serialize request: {}", e))?;

    println!("Sending request: {}", serde_json::to_string_pretty(&request).unwrap());
    println!("Sending {} bytes to 127.0.0.1:{}", request_bytes.len(), config.udp_port);
    
    send_bytes(state, request_bytes, format!("127.0.0.1:{}", config.udp_port)).await?;
    println!("Bytes sent successfully, waiting for response...");
    let (response_bytes, _) = receive_bytes(state, 5000).await?;
    println!("Received {} bytes", response_bytes.len());

    let response_str = str::from_utf8(&response_bytes)
        .map_err(|e| format!("Failed to decode response: {}", e))?;
    
    let response: Value = serde_json::from_str(response_str)
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(response)
}

#[tauri::command]
pub async fn portal_request(
    state: State<'_, PortalState>,
    method: String,
    params: Value,
) -> Result<Value, String> {
    portal_request_inner(&state, method, params).await
}

pub async fn initialize_portal_inner(
    state: &Arc<PortalState>, 
    bind_port: u16, 
    udp_port: u16
) -> Result<Value, String> {
    // Stop any existing portal process
    let mut portal_process = state.portal_process.lock().await;
    if let Some(process) = portal_process.as_mut() {
        let _ = process.stop();
    }

    // Start the portal process with the specified ports
    if portal_process.is_none() {
        *portal_process = Some(PortalProcess::new());
    }

    if let Some(process) = portal_process.as_mut() {
        process.start(bind_port, udp_port)
            .map_err(|e| format!("Failed to start portal process: {}", e))?;
    }

    // Return the port information
    Ok(serde_json::json!({
        "bindPort": bind_port,
        "udpPort": udp_port,
        "status": "initialized"
    }))
}

// pub async fn initialize_portal_inner(
//     state: &Arc<PortalState>,
//     bind_port: u16,
//     udp_port: u16,
// ) -> Result<Value, String> {
//     let mut portal_process = state.portal_process.lock().await;
    
//     if let Some(process) = portal_process.as_mut() {
//         process.stop()?;
//     }
    
//     let mut new_process = PortalProcess::new();
//     new_process.start(bind_port, udp_port)?;
//     *portal_process = Some(new_process);
    
//     Ok(serde_json::json!({
//         "status": "success",
//         "bind_port": bind_port,
//         "udp_port": udp_port,
//     }))
// }

#[tauri::command]
pub async fn initialize_portal(
    state: State<'_, Arc<PortalState>>,
    bind_port: u16,
    udp_port: u16,
) -> Result<Value, String> {
    initialize_portal_inner(&state, bind_port, udp_port).await
}

pub async fn initialize_udp_inner(
    state: &Arc<PortalState>,
    udp_port: u16,
) -> Result<Value, String> {
    let socket = UdpSocket::bind(format!("127.0.0.1:{}", udp_port))
        .await
        .map_err(|e| e.to_string())?;
    
    let mut socket_guard = state.socket.lock().await;
    if socket_guard.is_some() {
        return Err("UDP socket already initialized".to_string());
    }
    
    *socket_guard = Some(socket);
    
    Ok(serde_json::json!({
        "status": "success",
        "udp_port": udp_port
    }))
}

#[tauri::command]
pub async fn initialize_udp(
    state: State<'_, Arc<PortalState>>,
    udp_port: u16,
) -> Result<Value, String> {
    initialize_udp_inner(&state, udp_port).await
}

pub async fn stop_portal_inner(state: &Arc<PortalState>) -> Result<Value, String> {
    // Stop the portal process
    let mut portal_process = state.portal_process.lock().await;
    if let Some(process) = portal_process.as_mut() {
        process.stop()?;
    }
    *portal_process = None;

    // Close the UDP socket
    let mut socket_guard = state.socket.lock().await;
    *socket_guard = None;

    Ok(serde_json::json!({
        "status": "stopped"
    }))
}
// pub async fn stop_portal_inner(state: &Arc<PortalState>) -> Result<Value, String> {
//     let mut portal_process = state.portal_process.lock().await;
//     if let Some(process) = portal_process.as_mut() {
//         process.stop()?;
//         *portal_process = None;
//     }
    
//     Ok(serde_json::json!({
//         "status": "success"
//     }))
// }

#[tauri::command]
pub async fn stop_portal(
    state: State<'_, Arc<PortalState>>,
) -> Result<Value, String> {
    stop_portal_inner(&state).await
}