use std::collections::HashMap;
use std::sync::{Arc, Mutex};

use axum::{
    extract::ws::{Message, WebSocket, WebSocketUpgrade},
    extract::State,
    response::IntoResponse,
    routing::get,
    Router,
};
use serde::Serialize;
use tauri::{AppHandle, Manager};
use tokio::sync::broadcast;
use tower_http::services::ServeDir;

pub const BAND_SERVER_PORT: u16 = 11002;

// Same shape as the payload sent to the Tauri webview, kept separate
// so this module doesn't depend on lib.rs's internals.
#[derive(Serialize, Clone)]
pub struct OscMessagePayload {
    pub address: String,
    pub args: Vec<String>,
}

pub struct BandState {
    tx: broadcast::Sender<String>,
    // Latest value seen per OSC address, so late-joining followers
    // get a snapshot instead of a blank screen.
    cache: Mutex<HashMap<String, OscMessagePayload>>,
}

pub type SharedBandState = Arc<BandState>;

pub fn new_band_state() -> SharedBandState {
    Arc::new(BandState {
        tx: broadcast::channel(100).0,
        cache: Mutex::new(HashMap::new()),
    })
}

/// Call this from the OSC listener every time a message arrives.
/// Updates the cache and pushes to any connected followers.
pub fn broadcast_osc_message(state: &SharedBandState, payload: OscMessagePayload) {
    if let Ok(json) = serde_json::to_string(&payload) {
        state.cache.lock().unwrap().insert(payload.address.clone(), payload);
        let _ = state.tx.send(json); // Err just means nobody's connected right now — fine
    }
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<SharedBandState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, state: SharedBandState) {
    // 1. Send everything we currently know, so a mid-song joiner isn't blank.
    let cached: Vec<OscMessagePayload> = {
        let cache = state.cache.lock().unwrap();
        cache.values().cloned().collect() // clone out, drop lock before awaiting
    };
    for payload in cached {
        if let Ok(json) = serde_json::to_string(&payload) {
            if socket.send(Message::Text(json)).await.is_err() {
                return;
            }
        }
    }

    // 2. Stream live updates from here on.
    let mut rx = state.tx.subscribe();
    loop {
        tokio::select! {
            msg = rx.recv() => match msg {
                Ok(json) => {
                    if socket.send(Message::Text(json)).await.is_err() {
                        break;
                    }
                }
                Err(_) => break,
            },
            incoming = socket.recv() => match incoming {
                Some(Ok(Message::Close(_))) | None => break,
                Some(Ok(_)) => { /* room here later for a clock-sync ping/pong */ }
                _ => break,
            }
        }
    }
}

fn frontend_dist_path(app: &AppHandle) -> std::path::PathBuf {
    if cfg!(debug_assertions) {
        // Dev mode: read the build output straight from the frontend folder.
        // Run `npm run build` at least once so this path actually has files in it.
        std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../dist")
    } else {
        app.path()
            .resource_dir()
            .expect("failed to resolve resource dir")
            .join("dist")
    }
}

pub async fn start_band_server(app: AppHandle, state: SharedBandState) {
    let dist_path = frontend_dist_path(&app);

    let router = Router::new()
        .route("/ws", get(ws_handler))
        .fallback_service(ServeDir::new(dist_path))
        .with_state(state);

    let listener = match tokio::net::TcpListener::bind(format!("0.0.0.0:{BAND_SERVER_PORT}")).await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("Failed to bind band server on port {BAND_SERVER_PORT}: {e}");
            return;
        }
    };

    println!("Band server listening on 0.0.0.0:{BAND_SERVER_PORT}");
    if let Err(e) = axum::serve(listener, router).await {
        eprintln!("Band server crashed: {e}");
    }
}

#[tauri::command]
pub fn get_band_server_address() -> Result<String, String> {
    let ip = local_ip_address::local_ip().map_err(|e| e.to_string())?;
    Ok(format!("{ip}:{BAND_SERVER_PORT}"))
}

#[tauri::command]
pub fn broadcast_message(
    state: tauri::State<SharedBandState>,
    address: String,
    args: Vec<serde_json::Value>,
) -> Result<(), String> {
    let args: Vec<String> = args
        .into_iter()
        .map(|v| match v {
            serde_json::Value::String(s) => s,
            other => other.to_string(),
        })
        .collect();

    let payload = OscMessagePayload { address, args };
    broadcast_osc_message(state.inner(), payload);
    Ok(())
}
