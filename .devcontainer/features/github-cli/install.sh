#!/bin/bash
# Runs as root when the container is built. $_REMOTE_USER is the user that VS Code connects as.
# Downloads the official binary from GitHub releases (the ready-made feature uses apt from cli.github.com).
set -euo pipefail

case "$(uname -m)" in
  x86_64) arch=amd64 ;;
  aarch64 | arm64) arch=arm64 ;;
  *) echo "Unsupported architecture: $(uname -m)"; exit 1 ;;
esac

# The newest version: the "latest" link redirects to .../releases/tag/v2.x.y
version=$(curl -fsSLI -o /dev/null -w '%{url_effective}' https://github.com/cli/cli/releases/latest)
version=${version##*/v}
base="https://github.com/cli/cli/releases/download/v${version}"
folder="gh_${version}_linux_${arch}"
file="$folder.tar.gz"

curl -fsSL "$base/$file" -o "/tmp/$file"
(cd /tmp && curl -fsSL "$base/gh_${version}_checksums.txt" | grep " $file\$" | sha256sum -c -)
tar -xzf "/tmp/$file" -C /usr/local/bin --strip-components=2 --no-same-owner "$folder/bin/gh"
rm "/tmp/$file"

# git push to github.com uses the gh login. This is a system setting, so it works in every
# session (VS Code and SSH) and stays after a rebuild.
git config --system credential.https://github.com.helper '!gh auth git-credential'

# The login volume mounts on this folder. A new volume takes the owner of the folder in the image.
user="${_REMOTE_USER:-vscode}"
home=$(getent passwd "$user" | cut -d: -f6)
su "$user" -c "mkdir -p '$home/.config/gh'"

echo "Installed $(gh --version | head -n 1)."
