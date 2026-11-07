#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"

if [[ $# -ne 1 ]]; then
  echo "Usage: check.sh <lint|format|test|arch|typecheck|build>" >&2
  exit 2
fi

exec mise -C "$SCRIPT_DIR" exec -- \
  node "$SCRIPT_DIR/gate.mjs" "$1"
