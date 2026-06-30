use std::net::UdpSocket;
use rosc::{OscPacket, OscMessage, OscType, encoder};
use tauri::{AppHandle, Emitter};
use serde::Serialize;

#[derive(Serialize, Clone)]
struct OscMessagePayload {
    address: String,
    args: Vec<String>,
}

// --- Original greet command, kept as-is ---
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// --- OSC: send a message to Ableton ---
#[tauri::command]
fn send_osc(address: String, args: Vec<serde_json::Value>) -> Result<(), String> {
    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| e.to_string())?;

    // Map JSON values explicitly using your project's native serde_json crate
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

// --- OSC: background listener, emits incoming messages to the frontend ---
fn start_osc_listener(app: AppHandle) {
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
                        app.emit("osc-message", payload).ok();
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
            start_osc_listener(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, send_osc])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}