mod band_server;

use std::net::UdpSocket;
use rosc::{OscPacket, OscMessage, OscType, encoder};
use tauri::{AppHandle, Emitter, Manager};
use serde::Serialize;

use band_server::{
    broadcast_osc_message, new_band_state, start_band_server, get_band_server_address,
    broadcast_message, // add this
    OscMessagePayload as BandPayload, SharedBandState,
};

#[derive(Serialize, Clone)]
struct OscMessagePayload {
    address: String,
    args: Vec<String>,
}


// --- OSC: send a message to Ableton ---
#[tauri::command]
fn send_osc(address: String, args: Vec<serde_json::Value>) -> Result<(), String> {
    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;

    let osc_args: Vec<OscType> = args
        .into_iter()
        .map(|v| match v {
            serde_json::Value::String(s) => OscType::String(s),
            serde_json::Value::Number(n) => {
                if let Some(i) = n.as_i64() {
                    OscType::Int(i as i32)
                } else if let Some(f) = n.as_f64() {
                    OscType::Float(f as f32)
                } else {
                    OscType::Nil
                }
            }
            serde_json::Value::Bool(b) => OscType::Bool(b),
            _ => OscType::Nil,
        })
        .collect();

    let msg = OscMessage {
        addr: address,
        args: osc_args,
    };

    let packet = OscPacket::Message(msg);
    let bytes = encoder::encode(&packet).map_err(|e| e.to_string())?;

    socket
        .send_to(&bytes, "127.0.0.1:11000")
        .map_err(|e| e.to_string())?;

    Ok(())
}

// --- OSC: background listener, emits incoming messages to the frontend
//     AND forwards them to any connected band followers ---
fn start_osc_listener(app: AppHandle, band_state: SharedBandState) {
    std::thread::spawn(move || {
        let socket = UdpSocket::bind("0.0.0.0:11001").expect("Failed to bind OSC listener on port 11001");
        let mut buf = [0u8; 4096];

        loop {
            match socket.recv_from(&mut buf) {
                Ok((size, _addr)) => {
                    if let Ok((_, OscPacket::Message(msg))) = rosc::decoder::decode_udp(&buf[..size]) {
                        let payload = OscMessagePayload {
                            address: msg.addr.clone(),
                            args: msg.args.iter().map(|a| format!("{:?}", a)).collect(),
                        };

                        // existing behavior: notify the host's own Tauri webview
                        app.emit("osc-message", payload.clone()).ok();

                        // new: forward to band followers over WebSocket
                        let band_payload = BandPayload {
                            address: payload.address,
                            args: payload.args,
                        };
                        broadcast_osc_message(&band_state, band_payload);
                    }
                }
                Err(e) => eprintln!("OSC recv error: {e}"),
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let band_state = new_band_state();
            app.manage(band_state.clone());

            start_osc_listener(app.handle().clone(), band_state.clone());

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(start_band_server(app_handle, band_state));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![send_osc, get_band_server_address, broadcast_message])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}