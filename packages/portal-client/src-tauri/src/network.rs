use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use futures_util::{StreamExt, SinkExt};
use tauri::{Manager, State};
use tokio::net::UdpSocket;
use tokio::sync::{mpsc, Mutex};
use warp::filters::ws::{Message, WebSocket};
use warp::Filter;

pub struct Connection {
    udp_socket: Arc<UdpSocket>,
    tx: mpsc::Sender<Vec<u8>>,
}

pub async fn handle_websocket(ws: WebSocket, state: Arc<crate::state::PortalState>) {
  let (ws_tx, mut ws_rx) = ws.split();
  let ws_tx = Arc::new(Mutex::new(ws_tx));
  
  let mut next_port = state.next_port.lock().await; //TODO: Allow the system to use random port
  let port = *next_port;
  *next_port += 1;
  drop(next_port);
    
  // Bind UDP socket
  let udp_socket = match UdpSocket::bind(format!("0.0.0.0:{}", port)).await {
    Ok(socket) => Arc::new(socket),
    Err(e) => {
      eprintln!("Failed to bind UDP socket on port {}: {}", port, e);
      return;
    }
  };
    
  println!("WebSocket connection established with UDP port: {}", port);
  
  // Channel for sending UDP packets to WebSocket
  let (tx, mut rx) = mpsc::channel::<Vec<u8>>(100);
  
  // Store connection
  let connection_id = format!("conn_{}", port);
  {
    let mut connections = state.connections.lock().await;
    connections.insert(connection_id.clone(), Connection { udp_socket: udp_socket.clone(), tx });
  }
  
  // Send assigned port back to client
  let port_info = port.to_be_bytes();
  if let Err(e) = ws_tx.lock().await.send(Message::binary(port_info.to_vec())).await {
    eprintln!("Failed to send port info to WebSocket client: {}", e);
    return;
  }
    
  // Task for forwarding from UDP to WebSocket
  let udp_to_ws = {
      let ws_tx = ws_tx.clone();
      let mut ws_tx = ws_tx.clone();
      let udp_socket_clone = udp_socket.clone();
      
      tokio::spawn(async move {
        let mut buf = [0u8; 4096];
        
        loop {
          match udp_socket_clone.recv_from(&mut buf).await {
            Ok((n, src)) => {
              println!("Received UDP packet: {} bytes from {}:{}", n, src.ip(), src.port());
              // Format message as expected by WebSocketTransportService
              let rinfo = serde_json::json!({
                "address": src.ip().to_string(),
                "family": if src.is_ipv4() { "IPv4" } else { "IPv6" },
                "port": src.port()
              });
              
              let rinfo_str = rinfo.to_string();
              let rinfo_bytes = rinfo_str.as_bytes();
              let rinfo_len = (rinfo_bytes.len() as u16).to_be_bytes();
              
              let mut message = Vec::with_capacity(2 + rinfo_bytes.len() + n);
              message.extend_from_slice(&rinfo_len);
              message.extend_from_slice(rinfo_bytes);
              message.extend_from_slice(&buf[..n]);
              
              if let Err(e) = ws_tx.lock().await.send(Message::binary(message)).await {
                eprintln!("Failed to forward UDP packet to WebSocket: {}", e);
                break;
              }
            },
            Err(e) => {
              eprintln!("Error receiving UDP packet: {}", e);
              break;
            }
          }
        }
    })
  };
  
  // Forward messages from channel to WebSocket
  let channel_to_ws = {
    let mut ws_tx = ws_tx.clone();
    
    tokio::spawn(async move {
      while let Some(data) = rx.recv().await {
        if let Err(e) = ws_tx.lock().await.send(Message::binary(data)).await {
          eprintln!("Failed to send packet to WebSocket: {}", e);
          break;
        }
      }
    })
  };
    
  while let Some(result) = ws_rx.next().await {
    match result {
      Ok(msg) => {

       

        if msg.is_text() {
          println!("Received text message: {}", msg.to_str().unwrap_or("Invalid text"));
          
          // Check if it's a port message
          if let Ok(text) = msg.to_str() {
            if text.starts_with("port:") {
              println!("Port request received: {}", text);
            }
          }
        } else if msg.is_binary() {
          let data = msg.as_bytes();
          println!("Received binary message, length: {}", data.len());
          
          if data.len() < 6 {
            println!("Message too short! Expected at least 6 bytes, got {}", data.len());
            continue;
          }
          
          let preview_len = std::cmp::min(data.len(), 10);
          println!("First {} bytes: {:?}", preview_len, &data[0..preview_len]);
            
          // Parse destination address (first 6 bytes: 4 for IP, 2 for port)
          let ip = format!("{}.{}.{}.{}", data[0], data[1], data[2], data[3]);
          let port = u16::from_be_bytes([data[4], data[5]]);
          let dest_str = format!("{}:{}", ip, port);
          
          println!("Parsed destination: {}", dest_str);
            
            // Try to parse as socket address
          match dest_str.parse::<SocketAddr>() {
            Ok(dest) => {
              println!("Forwarding WebSocket message to UDP destination: {}", dest);
              
              println!("UDP payload being sent: {:?}", &data[6..]);
              println!("UDP payload length: {}", data.len() - 6);
              match udp_socket.clone().send_to(&data[6..], dest).await {
                Ok(bytes_sent) => {
                  println!("Successfully sent {} bytes to UDP destination", bytes_sent);
                }
                Err(e) => {
                  eprintln!("Failed to send UDP packet: {}", e);
                }
              }
            },
            Err(e) => {
              eprintln!("Failed to parse destination address: {}", e);
              eprintln!("Raw destination data: {:?}", &data[0..6]);
            }
          }
        } else {
          println!("Received non-binary/text message");
        }
      },
      Err(e) => {
        eprintln!("WebSocket error: {}", e);
        break;
      }
    }
  }    
    // Clean up
  {
    let mut connections = state.connections.lock().await;
    connections.remove(&connection_id);
  }
    
  println!("WebSocket connection closed, released UDP port: {}", port);
  udp_to_ws.abort();
  channel_to_ws.abort();
}

// Start the WebSocket server
pub async fn start_bridge_server(state: Arc<crate::state::PortalState>, ws_port: u16) {
  let state_filter = warp::any().map(move || state.clone());
  
  let websocket_route = warp::path("portal")
    .and(warp::ws())
    .and(state_filter)
    .map(|ws: warp::ws::Ws, state| {
        ws.on_upgrade(move |websocket| handle_websocket(websocket, state))
    });
  
  let routes = websocket_route.with(warp::cors().allow_any_origin());
  
  println!("Starting WebSocket-UDP bridge on port {}", ws_port);
  warp::serve(routes).run(([0, 0, 0, 0], ws_port)).await;
}
