// mod handlers;
// mod network;
// mod state;

// use std::sync::Arc;

// pub use handlers::*;
// pub use state::PortalState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // let ws_port = 5050;
    // let udp_starting_port = 40000;

    // println!("Initializing Portal Network application");
    
    // let portal_state = Arc::new(PortalState::new(udp_starting_port, ws_port));
    // let portal_state_clone = portal_state.clone();
    
    // tauri::async_runtime::spawn(async move {
    //     println!("Starting WebSocket-UDP bridge server task");
    //     network::start_bridge_server(portal_state_clone, ws_port).await;
    //     println!("WebSocket-UDP bridge server task completed");
    // });
   
    tauri::Builder::default()
        .plugin(tauri_plugin_udp::init())
        // .manage(portal_state)
        .invoke_handler(tauri::generate_handler![
            // get_websocket_url
        ])
        .setup(|_| {
            println!("Tauri application setup complete");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}