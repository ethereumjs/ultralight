use serde::Deserialize;
use serde_json::Value;

#[derive(Debug, Deserialize)]
pub struct PortalRequest {
    pub method: String,
    pub params: Value,
}