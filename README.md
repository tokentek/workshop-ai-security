# AI Security Workshop: Claude Code plugins

Security tools for Claude Code, used in the AI security and guardrails workshop.

## security-advisor

Skills make Claude Code more capable, but a skill is also code and instructions from a third party. A malicious skill can hide prompt injection, read secrets or send data to an external server.

The **security-advisor** plugin watches your session and helps you use skills safely:

- It checks the skills you use for prompt injection and hidden instructions.
- It finds data exfiltration patterns, for example requests to unknown servers.
- It identifies unsafe tool use, for example commands that delete or upload files.
- It warns you before a risky skill runs.

security-advisor works in the Claude Code CLI, Claude Code Desktop and the Claude Code VS Code extension. It needs no settings.

## Install

### Full install of marketplace and plugin
1. Install directly from terminal
   ````
   claude plugin install security-advisor --marketplace tokentek/workshop-ai-security
   ````

### OR Install marketplace and plugin

1. Add the marketplace:

   ```
   /plugin marketplace add tokentek/workshop-ai-security
   ```

2. Install the plugin:

   ```
   /plugin install security-advisor@ai-security-workshop
   ```

3. Restart Claude Code if the plugin does not start immediately.

4. Send a prompt as usual. security-advisor starts to protect your session.

## Uninstall

```
/plugin uninstall security-advisor@ai-security-workshop
```

## Demo devcontainer

The [`.devcontainer`](.devcontainer) folder at the repo root is a devcontainer with Node.js, Claude Code and Codex. It shows features, VS Code customizations, a login that stays, an egress firewall and a Claude Desktop connection over SSH. Open the repo in VS Code and click **Reopen in Container**. See its [README](.devcontainer/README.md).

## Safe Workshop Box

The [`safe-workshop-box`](safe-workshop-box) folder is a dev container: a safe, separate room for Claude Code with a firewall. See its [README](safe-workshop-box/README.md).

## Docker Sandbox

The [`docker-sandboxes`](docker-sandboxes) folder runs Claude Code and Codex in a Docker Sandbox: a microVM with a network allowlist, and with credentials that stay on the host. See its [README](docker-sandboxes/README.md).

## License

MIT. See [LICENSE](LICENSE).
