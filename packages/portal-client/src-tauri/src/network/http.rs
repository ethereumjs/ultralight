use axum::{
    routing::post,
    Router,
    Json,
    extract::State as AxumState,
    http::StatusCode,
};
use std::net::SocketAddr;
use std::sync::Arc;
use tauri::{Runtime, AppHandle, Manager};

use crate::state::PortalState;
use crate::types::{request::PortalRequest, response::PortalResponse};
use crate::handlers::portal;

async fn handle_portal_request(
    AxumState(state): AxumState<Arc<PortalState>>,
    Json(request): Json<PortalRequest>,
) -> Result<Json<PortalResponse>, (StatusCode, Json<PortalResponse>)> {
    let result = match request.method.as_str() {
         "initialize_portal" => {
            let bind_port = request.params.get("bind_port")
                .and_then(|v| v.as_u64())
                .map(|v| v as u16)
                .ok_or_else(|| (StatusCode::BAD_REQUEST, Json(PortalResponse {
                    result: None,
                    error: Some("Missing or invalid bind_port parameter".to_string()),
                })))?;
            
            let udp_port = request.params.get("udp_port")
                .and_then(|v| v.as_u64())
                .map(|v| v as u16)
                .ok_or_else(|| (StatusCode::BAD_REQUEST, Json(PortalResponse {
                    result: None,
                    error: Some("Missing or invalid udp_port parameter".to_string()),
                })))?;
            
            portal::initialize_portal_inner(&state, bind_port, udp_port).await
        },
        "shutdown_portal" => {
            portal::shutdown_portal_inner(&state).await
        },
        "portal_request" => {
            portal::portal_request_inner(&state, request.params).await
        },
        _ => Err("Unknown method".to_string())
    };

    match result {
        Ok(value) => Ok(Json(PortalResponse {
            result: Some(value),
            error: None,
        })),
        Err(e) => Err((
            StatusCode::BAD_REQUEST,
            Json(PortalResponse {
                result: None,
                error: Some(e),
            }),
        ))
    }
}

pub async fn start_http_server<R: Runtime>(app_handle: AppHandle<R>) {
    let state = app_handle.state::<Arc<PortalState>>().inner().clone();
    
    let cors = tower_http::cors::CorsLayer::new()
        .allow_origin(tower_http::cors::Any)
        .allow_methods([http::Method::POST])
        .allow_headers([http::header::CONTENT_TYPE]);
    
    let app = Router::new()
        .route("/api/portal", post(handle_portal_request))
        .layer(cors)
        .with_state(state);

    let addr = SocketAddr::from(([127, 0, 0, 1], 8080));
    println!("Starting HTTP server on {}", addr);
    
    axum::serve(
        tokio::net::TcpListener::bind(addr)
            .await
            .expect("Failed to bind server"),
        app.into_make_service(),
    )
    .await
    .expect("Failed to start HTTP server");
}
