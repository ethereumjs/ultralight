#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
	tauri::Builder::default()
		.plugin(tauri_plugin_udp::init())
		.invoke_handler(tauri::generate_handler![])
		.setup(|_| {
			println!("Tauri application setup complete");
			Ok(())
		})
		.run(tauri::generate_context!())
		.expect("error while running tauri application");
}