# AI Workshop Demo devcontainer

This devcontainer gives you a ready computer with Node.js, Claude Code, Codex and the GitHub CLI. Open the repo in VS Code and click **Reopen in Container**. That is all.

## What is in the folder

```
.devcontainer/
├── devcontainer.json        the instructions: image, features, login volumes, colours
├── devcontainer-lock.json   the exact version of each ready-made feature (here: sshd)
└── features/                our own local features
    ├── corporate-ca/        trusts a company root certificate (if you put one in certs/)
    ├── node/                Node.js from nodejs.org
    ├── claude-code/         Claude Code with the native installer from claude.ai
    ├── codex/               the Codex CLI from GitHub releases
    ├── github-cli/          the GitHub CLI (gh) from GitHub releases, for git push and pull requests
    └── firewall/            blocks all outgoing traffic except an allowlist
```

There is no Dockerfile. The container starts from a small base image, and the features add the tools.

## The concepts in devcontainer.json

| Block | What it shows |
|---|---|
| `image` | A small base image from Microsoft, with no dev tools. |
| `features` | Add-ons that install tools. `ghcr.io/...` is a ready-made feature from a registry (here: `sshd`). `./features/...` is our own feature, in this repo. A feature can have options (`"version": "22"`, `"allowedSites"`). |
| `overrideFeatureInstallOrder` | The features in this list install first. The certificate must come before the downloads. |
| `mounts` + `containerEnv` | Named Docker volumes keep the Claude, Codex and GitHub CLI login. You log in one time. The login stays after a reconnect, a rebuild or a new container. |
| `customizations.vscode` | VS Code settings and extensions for the container window only. The window turns purple, so you always see that you are in the container. |
| `postStartCommand` | A command that runs at each start of the container. A feature can have one too: the firewall starts this way. |
| `initializeCommand` | A command that runs on **your** computer before the build. Here it makes an SSH key for Claude Desktop. |

## Connect from VS Code

1. Install **Docker Desktop** and **VS Code** with the **Dev Containers** extension. On Windows, clone and open the repo in WSL, because `initializeCommand` is a Linux shell command.
2. Open the repo folder in VS Code.
3. Click **Reopen in Container** (or run *Dev Containers: Reopen in Container* from the command palette).
4. Wait until the terminal shows `Firewall is ON`.

## Log in one time

1. In the container terminal, run `claude` and log in. Open the link in your normal browser.
2. Run `codex login`. VS Code forwards port 1455, so the browser login comes back to the container.
3. Close the window and reopen the container. You are still logged in.

The login is in the Docker volumes `ai-workshop-claude`, `ai-workshop-codex` and `ai-workshop-gh`. To log out completely, delete the volumes:

```sh
docker volume rm ai-workshop-claude ai-workshop-codex ai-workshop-gh
```

## Push and make pull requests (optional)

The container has the GitHub CLI (`gh`). After you log in, `git push` and `gh pr create` work in every session, also over SSH from Claude Desktop.

A token in the container is a token that the agent can use. Give it as little access as possible:

1. On GitHub, make a **fine-grained personal access token** for this repo only, with read and write access to **Contents** and **Pull requests**. For a repo in an organization, the organization must allow such tokens.
2. In the container terminal, run `gh auth login`. Select **GitHub.com**, **HTTPS**, and **Paste an authentication token**.
3. Test it: `gh auth status`.

Do not use the browser login of `gh auth login`: it gives a token with access to all your repos. Protect the `main` branch on GitHub, so that the token can push branches and open pull requests, but cannot change `main`.

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

3. Test it in a terminal: `ssh ai-workshop-demo claude --version`. If it shows a version, SSH works.
4. Log in to Claude Code one time, if you did not do it before (see "Log in one time").
5. In Claude Desktop, select **New environment > SSH**, and type `ai-workshop-demo` as the SSH host.
6. Select a folder in the container for the session.

How it works: the `ProxyCommand` starts `sshd` in the container with `docker exec`. At each start, `postStartCommand` copies your public key to `~/.ssh/authorized_keys` in the container.

Good to know:

- The connection uses `docker exec`, so the container publishes no port to your computer. The `sshd` feature also starts an SSH server on port 2222 in the Docker network. This connection does not use it.
- The firewall stays on. Claude can reach only the sites in `allowedSites`.
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
| `sudo iptables -F OUTPUT` | A password question: the user cannot switch the firewall off |

**Challenge:** add `example.com` to `allowedSites`, then run *Dev Containers: Rebuild Container*. Can you reach example.com now?

The base image lets the `vscode` user run every command with `sudo`. The firewall feature changes that: `sudo` works for the firewall script only. Without this change, an agent in the container can remove the firewall rules with one command. To install a tool, add a feature and rebuild.

Limits:

- DNS is open to every server, so data can leave the container in DNS questions.
- `github.com` is on the allowlist, so an agent can push data to any repo there. An allowlist of sites does not control what data goes to those sites.
- The allowlist is a list of IP addresses. Other sites on the same address (a CDN, or a company proxy) are reachable too.
- The firewall starts after the container starts. For the first seconds, all traffic is open.
- The firewall finds the IP addresses of the sites when the container starts. Some sites change their addresses. If a site stops working, restart the container.
- If a VS Code extension does not install, its download site is not on the allowlist. Find the site in the VS Code log and add it.

## Company networks

Some company networks inspect TLS traffic. Then downloads fail with `unable to get local issuer certificate`. Put the company root certificate in `features/corporate-ca/certs/` (see the README there) and rebuild.

Some company networks also block `raw.githubusercontent.com` and `registry.npmjs.org`. That is why our features download Node.js, Claude Code and Codex from their official sites, and do not use the official Node feature (nvm) or npm.
