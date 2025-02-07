use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::net::UdpSocket;
use crate::portal_process::PortalProcess;

#[derive(Clone)]
pub struct PortalState {
    pub(crate) socket: Arc<Mutex<Option<UdpSocket>>>,
    pub(crate) config: Arc<Mutex<Option<PortalConfig>>>,
    pub(crate) portal_process: Arc<Mutex<Option<PortalProcess>>>,
}

#[derive(Clone, Debug)]
pub struct PortalConfig {
    pub bind_port: u16,
    pub udp_port: u16,
}

impl PortalState {
    pub fn new() -> Self {
        Self {
            socket: Arc::new(Mutex::new(None)),
            config: Arc::new(Mutex::new(None)),
            portal_process: Arc::new(Mutex::new(None)),
        }
    }
}

impl Default for PortalState {
    fn default() -> Self {
        Self::new()
    }
}