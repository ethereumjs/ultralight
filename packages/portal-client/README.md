# Portalclient

This application provides an interface for interacting with Ethereum data via the Ultralight Portal Network, supporting mobile devices, desktop systems, and web browsers.

## Prerequisites

- Node.js (v20+ recommended)
- npm (v10+ recommended)
- install the Rust toolchain using Rustup 
  - `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- For iOS testing: Xcode (macOS only)

## Usage

### Local Development/Testing

 - Install the necessary pacakges:
`npm install`

 - Build the application first:
`npm run build`

 - Start the application in development mode:
`npm run tauri dev`

### Mobile Testing

 - Setup iOS Simulator `npm run tauri ios init`

 - Run on iOS Simulator `npm run tauri ios dev`

### Debugging on iOS
For Safari debugging:

1. Enable Develop Menu:
    - Open Safari → Preferences → Advanced

    - Check "Show Develop menu in menu bar"

2. Debug Web Content:

    - Run your app in simulator/device

    - In Safari: Develop → [Your Device Name] → PortalClient