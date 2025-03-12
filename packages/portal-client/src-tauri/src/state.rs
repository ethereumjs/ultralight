use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use crate::network::Connection;

pub struct PortalState {
    pub connections: Mutex<HashMap<String, Connection>>,
    pub next_port: Mutex<u16>,
    pub ws_port: u16,
}

impl PortalState {
    pub fn new(starting_port: u16, ws_port: u16) -> Self {
        Self {
            connections: Mutex::new(HashMap::new()),
            next_port: Mutex::new(starting_port),
            ws_port,
        }
    }
}
