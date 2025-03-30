#!/bin/bash
# Change to your project directory
cd ~/Projects/ultralight/packages/portal-client || exit

# Run Tauri dev in the background
npm run tauri dev &

# Wait for Vite to connect (adjust time as needed)
sleep 10

# Open Safari and developer console
osascript <<'EOF'
tell application "Safari"
    activate
    delay 2
end tell

tell application "System Events"
    tell process "Safari"
        set frontmost to true
        delay 0.5
        
        # Click Develop menu
        click menu bar item "Develop" of menu bar 1
        delay 0.5
        
        # Select "Justin's MacBook Pro" submenu (4th item)
        click menu item 4 of menu "Develop" of menu bar item "Develop" of menu bar 1
        delay 0.5
        
        # Select localhost (1st item in submenu)
        click menu item 1 of menu "Justin's MacBook Pro" of menu item 4 of menu "Develop" of menu bar item "Develop" of menu bar 1
    end tell
end tell
EOF

echo "Tauri dev server and Safari DevTools launched"