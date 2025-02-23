use crate::state::PortalState;
use crate::portal_process::PortalProcess;
use crate::network::udp::{send_bytes, receive_bytes};

use serde_json::Value;
use tauri::State;
use std::sync::Arc;
use tokio::net::UdpSocket;
use std::net::SocketAddr;
use serde_json::json;

pub async fn portal_request_inner(
    state: &Arc<PortalState>,
    params: Value,
) -> Result<Value, String> {

    let port_guard = state.udp_port.lock().await;
    let udp_port = port_guard.ok_or_else(|| "UDP port not initialized".to_string())?;
    
    let rpc_method = params.get("method")
        .and_then(|m| m.as_str())
        .ok_or_else(|| "Missing RPC method in params".to_string())?;
    
    let rpc_params = params.get("params")
        .cloned()
        .unwrap_or(serde_json::json!([]));

    println!("rpc params on the server {}", rpc_params);

    let request = serde_json::json!({
        "jsonrpc": "2.0",
        "method": rpc_method,
        "params": rpc_params,
        "id": 1
    });

    let request_bytes = serde_json::to_vec(&request)
        .map_err(|e| format!("Failed to serialize request: {}", e))?;

    let target_addr = format!("127.0.0.1:{}", udp_port);

    send_bytes(state, request_bytes, target_addr.clone()).await?;

    let (response_bytes, _addr) = receive_bytes(state, 10000).await?;

    let response: Value = serde_json::from_slice(&response_bytes)
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(response)
}

#[tauri::command]
pub async fn portal_request(
    state: tauri::State<'_, Arc<PortalState>>,
    params: Value,
) -> Result<Value, String> {
    portal_request_inner(&state, params).await
}

pub async fn initialize_portal_inner(
    state: &Arc<PortalState>,
    bind_port: u16,
    udp_port: u16,
) -> Result<Value, String> {
    let socket_addr = initialize_socket(state).await?;
    let dynamic_udp_port = socket_addr.port();

    let mut port_guard = state.udp_port.lock().await;
    *port_guard = Some(udp_port);

    let mut process_guard = state.portal_process.lock().await;
    if process_guard.is_none() {
        *process_guard = Some(PortalProcess::new());
    }

    if let Some(process) = process_guard.as_mut() {
        process.start(bind_port, udp_port)?;
    }

    Ok(serde_json::json!({
        "bindPort": bind_port,
        "udpPort": udp_port,
        "dynamicPort": dynamic_udp_port,
        "status": "initialized",
        "socketAddress": format!("{}", socket_addr)
    }))
}

async fn initialize_socket(state: &Arc<PortalState>) -> Result<SocketAddr, String> {
    let mut socket_guard = state.socket.lock().await;
    
    if let Some(existing_socket) = socket_guard.as_ref() {
        return existing_socket.local_addr()
            .map_err(|e| format!("Failed to get socket address: {}", e));
    }

    println!("Initializing UDP socket for Portal Network...");
    let socket = UdpSocket::bind("0.0.0.0:0").await
        .map_err(|e| format!("Failed to bind initial socket: {}", e))?;
    
    let bound_addr = socket.local_addr()
        .map_err(|e| format!("Failed to get bound address: {}", e))?;
    
    println!("Socket bound successfully to {}", bound_addr);
    *socket_guard = Some(socket);
    
    Ok(bound_addr)
}

#[tauri::command]
pub async fn initialize_portal(
    state: State<'_, Arc<PortalState>>,
    bind_port: u16,
    udp_port: u16,
) -> Result<Value, String> {
    initialize_portal_inner(&state, bind_port, udp_port).await
}


pub async fn shutdown_portal_inner(state: &Arc<PortalState>) -> Result<Value, String> {
    
    let mut process_guard = state.portal_process.lock().await;
    if let Some(process) = process_guard.as_mut() {
        process.stop()?;
    }
    *process_guard = None;

    let mut socket_guard = state.socket.lock().await;
    *socket_guard = None;

    let mut port_guard = state.udp_port.lock().await;
    *port_guard = None;

    Ok(serde_json::json!({
        "status": "stopped"
    }))
}

#[tauri::command]
pub async fn shutdown_portal(
    state: State<'_, Arc<PortalState>>,
) -> Result<Value, String> {
    shutdown_portal_inner(&state).await
}

// #[tokio::test]
// async fn test_portal_request_inner() {
//     let state = Arc::new(PortalState::new());

//     let bind_port = 8080;
//     let udp_port = 9090;
//     let _ = initialize_portal_inner(&state, bind_port, udp_port).await;

//     let params = json!({
//         "method": "eth_getBlockByNumber",
//         "params": ["6757657"]
//     });

//     let result = portal_request_inner(&state, params).await;
//     assert!(result.is_err());
// }

// #[tokio::test]
// async fn test_initialize_socket() {
//     let state = Arc::new(PortalState::new());

//     let result = initialize_socket(&state).await;
//     assert!(result.is_ok());

//     let socket_guard = state.socket.lock().await;
//     assert!(socket_guard.is_some(), "Socket should be initialized");
// }

// #[tokio::test]
// async fn test_initialize_portal_inner() {
//     let state = Arc::new(PortalState::new());

//     let bind_port = 9090;
//     let udp_port = 8545;
    
//     let result = initialize_portal_inner(&state, bind_port, udp_port).await;
//     assert!(result.is_ok(), "Initialization should succeed");
    
//     let response = result.unwrap();
//     assert_eq!(response["bindPort"], bind_port);
//     assert_eq!(response["udpPort"], udp_port);
//     assert!(response["dynamicPort"].as_u64().is_some(), "Dynamic port should be assigned");
//     assert_eq!(response["status"], "initialized");
    
//     let port_guard = state.udp_port.lock().await;
//     assert_eq!(port_guard.unwrap(), udp_port, "UDP port should be stored in state");
    
//     let process_guard = state.portal_process.lock().await;
//     assert!(process_guard.is_some(), "Portal process should be initialized");
// }

//  #[tokio::test]
// async fn test_shutdown_portal_inner() {
//     let state = Arc::new(PortalState::new());

//     let bind_port = 8080;
//     let udp_port = 9090;
//     let _ = initialize_portal_inner(&state, bind_port, udp_port).await;

//     let result = shutdown_portal_inner(&state).await;
//     assert!(result.is_ok());

//     let value = result.unwrap();
//     assert_eq!(value["status"], "stopped");

//     let process_guard = state.portal_process.lock().await;
//     assert!(process_guard.is_none());

//     let socket_guard = state.socket.lock().await;
//     assert!(socket_guard.is_none());

//     let port_guard = state.udp_port.lock().await;
//     assert!(port_guard.is_none());
// }