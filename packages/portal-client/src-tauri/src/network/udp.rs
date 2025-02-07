use crate::state::PortalState;
use tokio::time::{timeout, Duration};

pub async fn send_bytes(
    state: &PortalState,
    bytes: Vec<u8>,
    target: String,
) -> Result<(), String> {
    let socket_guard = state.socket.lock().await;
    let socket = socket_guard.as_ref().ok_or("Socket not initialized")?;
    
    println!("About to send bytes to {}", target);
    match socket.send_to(&bytes, &target).await {
        Ok(n) => {
            println!("Successfully sent {} bytes", n);
            Ok(())
        },
        Err(e) => {
            println!("Failed to send bytes: {}", e);
            Err(format!("Failed to send bytes: {}", e))
        }
    }
}

pub async fn receive_bytes(
    state: &PortalState,
    timeout_ms: u64,
) -> Result<(Vec<u8>, String), String> {
    let socket_guard = state.socket.lock().await;
    let socket = socket_guard.as_ref().ok_or("Socket not initialized")?;

    let mut buf = vec![0u8; 65535];
    
    match timeout(Duration::from_millis(timeout_ms), socket.recv_from(&mut buf)).await {
        Ok(Ok((len, addr))) => {
            buf.truncate(len);
            Ok((buf, addr.to_string()))
        }
        Ok(Err(e)) => Err(format!("Failed to receive bytes: {}", e)),
        Err(_) => Err("Receive timeout".to_string())
    }
}