use tauri::{command, State};
use std::sync::Arc;
use crate::state::PortalState;

#[command]
pub fn get_websocket_url(state: State<Arc<PortalState>>) -> String {
    format!("ws://localhost:{}/portal", state.ws_port)
}
