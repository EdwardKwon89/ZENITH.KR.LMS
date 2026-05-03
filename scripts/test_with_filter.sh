#!/bin/bash

COMMAND=$1
OUTPUT_PATH=$2

if [ -z "$COMMAND" ] || [ -z "$OUTPUT_PATH" ]; then
    echo "Usage: $0 \"명령어\" \"저장경로\""
    exit 1
fi

mkdir -p $(dirname "$OUTPUT_PATH")

echo "🚀 Running test with filtering..."

eval "$COMMAND" 2>&1 | grep -Ev "MISSING_MESSAGE|at getFallbackFromErrorAndNotify|at translateBaseFn|at translateFn|at NaviSidebar|at renderWithHooks|at updateFunctionComponent|at beginWork|at runWithFiberInDEV|at performUnitOfWork|at workLoopConcurrentByScheduler|at renderRootConcurrent|at performWorkOnRoot|at MessagePort.performWorkUntilDeadline" | tee "$OUTPUT_PATH"

echo "---
✅ Test completed. Log saved to $OUTPUT_PATH"
ls -lh "$OUTPUT_PATH"
