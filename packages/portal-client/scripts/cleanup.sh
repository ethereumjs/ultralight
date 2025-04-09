#!/bin/bash

# Define directories to delete
DIRS=("src-tauri/target" "src-tauri/gen" "dist")

# Loop through each directory and delete if it exists
for dir in "${DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "Deleting $dir..."
    rm -rf "$dir"
  else
    echo "$dir does not exist, skipping..."
  fi
done

echo "Cleanup complete."
