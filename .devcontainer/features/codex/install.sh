#!/bin/bash
# Runs as root when the container is built. $_REMOTE_USER is the user that VS Code connects as.
# Downloads the official binary from GitHub releases (the usual install uses npm).
set -euo pipefail

case "$(uname -m)" in
  x86_64) target=x86_64-unknown-linux-musl ;;
  aarch64 | arm64) target=aarch64-unknown-linux-musl ;;
  *) echo "Unsupported architecture: $(uname -m)"; exit 1 ;;
esac

curl -fsSL "https://github.com/openai/codex/releases/latest/download/codex-${target}.tar.gz" | tar -xz -C /tmp
install -m 755 "/tmp/codex-${target}" /usr/local/bin/codex
rm "/tmp/codex-${target}"

# The login volume mounts on this folder. A new volume takes the owner of the folder in the image.
user="${_REMOTE_USER:-vscode}"
home=$(getent passwd "$user" | cut -d: -f6)
su "$user" -c "mkdir -p '$home/.codex'"

echo "Installed $(codex --version)."
