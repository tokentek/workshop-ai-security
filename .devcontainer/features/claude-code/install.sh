#!/bin/bash
# Runs as root when the container is built. $_REMOTE_USER is the user that VS Code connects as.
# Uses the native installer from claude.ai (the official Claude Code feature uses npm).
set -euo pipefail

user="${_REMOTE_USER:-vscode}"
home=$(getent passwd "$user" | cut -d: -f6)

# Install as the container user, so that Claude Code can update itself later
su "$user" -c 'curl -fsSL https://claude.ai/install.sh | bash'

# Put claude on the PATH for every shell
ln -sf "$home/.local/bin/claude" /usr/local/bin/claude

echo "Installed Claude Code $(su "$user" -c 'claude --version')."
