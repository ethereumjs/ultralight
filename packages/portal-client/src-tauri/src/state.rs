use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::net::UdpSocket;

use crate::portal_process::PortalProcess;

#[derive(Clone)]
pub struct PortalState {
    pub(crate) socket: Arc<Mutex<Option<UdpSocket>>>,
    pub frontend_socket: Arc<Mutex<Option<UdpSocket>>>,
    pub(crate) portal_process: Arc<Mutex<Option<PortalProcess>>>,
    pub udp_port: Arc<Mutex<Option<u16>>>,
}

impl PortalState {
    pub fn new() -> Self {
        Self {
            socket: Arc::new(Mutex::new(None)),
            frontend_socket: Arc::new(Mutex::new(None)),
            portal_process: Arc::new(Mutex::new(None)),
            udp_port: Arc::new(Mutex::new(None)),
        }
    }
}

impl Default for PortalState {
    fn default() -> Self {
        Self::new()
    }
}