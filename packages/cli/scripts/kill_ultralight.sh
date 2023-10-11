ps aux | grep ultralight | awk '{print $2}' | while read pid; do kill -9 $pid; done
