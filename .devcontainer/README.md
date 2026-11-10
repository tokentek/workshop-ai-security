# AI Workshop Demo devcontainer

This devcontainer gives you a ready computer with Node.js, Claude Code and Codex. Open the repo in VS Code and click **Reopen in Container**. That is all.

## What is in the folder

```
.devcontainer/
├── devcontainer.json        the instructions: image, features, login volumes, colours
└── features/                our own local features
    ├── corporate-ca/        trusts a company root certificate (if you put one in certs/)
    ├── node/                Node.js from nodejs.org
    ├── claude-code/         Claude Code with the native installer from claude.ai
    ├── codex/               the Codex CLI from GitHub releases
    └── firewall/            blocks all outgoing traffic except an allowlist
```

There is no Dockerfile. The container starts from a small base image, and the features add the tools.

## The concepts in devcontainer.json

| Block | What it shows |
|---|---|
| `image` | A small base image from Microsoft, with no dev tools. |
| `features` | Add-ons that install tools. `ghcr.io/...` is a ready-made feature from a registry (here: `sshd`). `./features/...` is our own feature, in this repo. A feature can have options (`"version": "22"`, `"allowedSites"`). |
| `overrideFeatureInstallOrder` | The features install in this order. The certificate must come first. |
| `mounts` + `containerEnv` | Named Docker volumes keep the Claude and Codex login. You log in one time. The login stays after a reconnect, a rebuild or a new container. |
| `customizations.vscode` | VS Code settings and extensions for the container window only. The window turns purple, so you always see that you are in the container. |
| `postCreateCommand`, `postStartCommand` | Commands that run after the container is made, and at each start. |
| `initializeCommand` | A command that runs on **your** computer before the build. Here it makes an SSH key for Claude Desktop. |

## Connect from VS Code

1. Install **Docker Desktop** and **VS Code** with the **Dev Containers** extension.
2. Open the repo folder in VS Code.
3. Click **Reopen in Container** (or run *Dev Containers: Reopen in Container* from the command palette).
4. Wait until the terminal shows `Firewall is ON`.

## Log in one time

1. In the container terminal, run `claude` and log in. Open the link in your normal browser.
2. Run `codex login`. VS Code forwards port 1455, so the browser login comes back to the container.
3. Close the window and reopen the container. You are still logged in.

The login is in the Docker volumes `ai-workshop-claude` and `ai-workshop-codex`. To log out completely, delete the volumes:

```sh
docker volume rm ai-workshop-claude ai-workshop-codex
```

## Connect from Claude Desktop (SSH)

Claude Desktop can run a Code session over SSH. The container has an SSH server for this.

1. Start the container first (with VS Code, or with `npx @devcontainers/cli up --workspace-folder .`). Claude Desktop cannot start it.
2. Add this block to `~/.ssh/config` on your computer:

   ```text
   Host ai-workshop-demo
     User vscode
     IdentityFile ~/.ssh/ai-workshop-demo
     IdentitiesOnly yes
     ProxyCommand docker exec -i ai-workshop-demo /usr/sbin/sshd -i
     StrictHostKeyChecking accept-new
   ```

3. Test it in a terminal: `ssh ai-workshop-demo claude --version`.
4. In Claude Desktop, select **New environment > SSH**, and type `ai-workshop-demo` as the SSH host.

Good to know:

- The connection uses `docker exec`, so the container opens no network port.
- The key `~/.ssh/ai-workshop-demo` is for this container only. Only the public key goes into the container.
- The first connection installs Claude Code in `~/.claude/remote/` (about 1 GB, in the login volume, one time only).
- A rebuild makes new SSH host keys. If SSH shows a host-key warning, run `ssh-keygen -R ai-workshop-demo`.
- Over SSH, Claude Desktop has no Browser pane, and its file pane is read-only.

## The firewall

All outgoing traffic is blocked, except the sites in `allowedSites` in `devcontainer.json`. Try it in the container terminal:

| Command | Result |
|---|---|
| `curl -I https://api.anthropic.com` | An answer: on the allowlist |
| `curl https://example.com` | `Couldn't connect`: blocked |

**Challenge:** add `example.com` to `allowedSites`, then run *Dev Containers: Rebuild Container*. Can you reach example.com now?

Limits:

- The firewall finds the IP addresses of the sites when the container starts. Some sites change their addresses. If a site stops working, restart the container.
- If a VS Code extension does not install, its download site is not on the allowlist. Find the site in the VS Code log and add it.

## Company networks

Some company networks inspect TLS traffic. Then downloads fail with `unable to get local issuer certificate`. Put the company root certificate in `features/corporate-ca/certs/` (see the README there) and rebuild.

Some company networks also block `raw.githubusercontent.com` and `registry.npmjs.org`. That is why our features download Node.js, Claude Code and Codex from their official sites, and do not use the official Node feature (nvm) or npm.
