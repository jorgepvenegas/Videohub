#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if ! command -v node >/dev/null 2>&1; then
  if [[ "$(uname -s)" == "Darwin" ]]; then
    printf '%s\n' 'Node.js 22.18 or newer is required. With Homebrew: brew install node ffmpeg. Then run setup.sh again.' >&2
  else
    printf '%s\n' 'Node.js 22.18 or newer is required. Install it with your distribution package manager, then run setup.sh again.' >&2
  fi
  exit 1
fi
node_version="$(node -p 'process.versions.node')"
IFS=. read -r node_major node_minor _ <<<"$node_version"
if (( node_major < 22 || (node_major == 22 && node_minor < 18) )); then
  printf '%s\n' "Node.js 22.18 or newer is required (found $node_version). Upgrade Node.js, then run setup.sh again." >&2
  exit 1
fi
exec node scripts/install.ts setup "$@"
