use serde::Serialize;
use serde_json::Value;

#[derive(Debug, Serialize)]
pub struct PortalResponse {
    pub result: Option<Value>,
    pub error: Option<String>,
}