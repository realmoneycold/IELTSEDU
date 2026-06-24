#!/bin/bash
export ANTHROPIC_BASE_URL="https://openrouter.ai/api"
export ANTHROPIC_AUTH_TOKEN="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"
export ANTHROPIC_MODEL="qwen/qwen3-coder:free"
unset ANTHROPIC_API_KEY
claude --no-tools --max-tokens 1000 "$@"
