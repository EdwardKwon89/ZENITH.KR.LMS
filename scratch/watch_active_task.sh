#!/bin/bash
# Description: Event-driven watcher for ACTIVE_TASK.md modification.
# Exits with 0 when the file changes, triggering the Agent's reactive wakeup.

FILE=".agent/ACTIVE_TASK.md"

if [ ! -f "$FILE" ]; then
  echo "Error: $FILE does not exist."
  exit 1
fi

INIT_TIME=$(stat -f %m "$FILE")
echo "Watching $FILE for modifications... (Initial timestamp: $INIT_TIME)"

while true; do
  if [ ! -f "$FILE" ]; then
    echo "Warning: $FILE vanished."
    exit 1
  fi
  
  CURRENT_TIME=$(stat -f %m "$FILE")
  if [ "$CURRENT_TIME" != "$INIT_TIME" ]; then
    echo "Change detected! File updated to timestamp: $CURRENT_TIME"
    exit 0
  fi
  
  sleep 5
done
