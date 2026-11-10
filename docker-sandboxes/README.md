# Autonomous agents sandbox

This folder gives a [Docker Sandbox](https://docs.docker.com/ai/sandboxes/) for autonomous coding agents. The sandbox is an isolated microVM. It has Claude Code and Codex, `gh` and `git`, and the Azure CLI for Azure DevOps.

The sandbox shows four controls:

- **Isolation.** The agent runs in its own virtual machine. From your computer it sees only the project folder.
- **Network allowlist.** A proxy on your computer checks each request. The sandbox reaches only the hosts that a rule allows.
- **Credentials stay on the host.** The sandbox sees only placeholders (sentinels). The proxy adds the real values to the requests.
- **Rules for requests.** A rule can allow a host for some HTTP methods only, or block a method on a path.

The sandbox also has limits. See "What the sandbox does not stop".

## The smallest example

You do not need this folder to try a sandbox. Go to a project folder and run:

```sh
sbx run --name demo claude    # Claude Code in a sandbox; the current folder is the workspace
sbx ls                        # list the sandboxes
sbx rm demo                   # remove the sandbox; the files in your folder stay
```

The rest of this page is about the environment in this folder. It adds tools, credentials and network rules with kits and an environment file.

## What is in the sandbox

`sbxenv.yaml` puts these kits together:

| Kit | Source | What it adds |
|---|---|---|
| Claude Code (workload) | `docker.io/docker/sbx-kit-claude:2.1.316` | `claude` in bypass-permissions mode, Anthropic egress and credential |
| Codex | `docker.io/docker/sbx-kit-codex-mixin:0.166.0` | `codex` with `approval_policy = "never"`, OpenAI egress and credential |
| GitHub CLI | `docker.io/docker/sbx-kit-gh:2.103.2` | `gh`, GitHub egress, `GH_TOKEN` sentinel. `DELETE` on `api.github.com/repos/**` is blocked. |
| Azure DevOps | `kits/azure-devops` (local) | `az` with the `azure-devops` extension, git over HTTPS, your Entra ID token as Bearer auth. `DELETE` on projects and repositories is blocked. |
| Agent workbench | `kits/agent-workbench` (local) | Your Git identity, read-only egress to package registries, working rules for the agents |

The Docker kit images are the official v3 kits. The two local kits follow the [kit v3 specification](https://github.com/docker/sandbox-kit-spec/blob/main/docs/spec/SPEC-v3.md). Read them as examples: `kits/agent-workbench` is the short one, and `kits/azure-devops` shows a credential for your own service.

`sbxenv.yaml` is the environment file. It names the agent, the kits, the size and the project folder. It provisions the Azure DevOps token from your `az login`, and it approves the hosts where the proxy may use each credential.

`bin/agents` is a small wrapper. It gives the file, your project folder and a fixed sandbox name to `sbx env`.

## One-time setup

This setup uses your own sign-ins. It does not need an API key or a Personal Access Token (PAT).

The commands are for macOS 14 or later on Apple silicon, with Homebrew. `sbx` also runs on Windows 11 and on Ubuntu 24.04: see [Install Docker Sandboxes](https://docs.docker.com/ai/sandboxes/install/). On Linux, change the path of `az` in `sbxenv.yaml` and the path of `gh` in step 6.

1. Install `sbx` (v0.51.0 or later) and sign in to Docker:

   ```sh
   brew trust docker/tap
   brew install docker/tap/sbx
   sbx login
   ```

2. Select the network preset **Locked Down**. The first sandbox run asks for the preset. To set it without the question:

   ```sh
   sbx policy init deny-all
   ```

   With Locked Down, a sandbox reaches only the hosts that a kit or you allow. The other presets allow more, see "Network egress". If you selected a preset before, `sbx policy ls` shows the active rules.

3. Install the Azure CLI and sign in. The sandbox proxy gets a short-lived Azure DevOps token from this sign-in:

   ```sh
   brew install azure-cli
   az login
   ```

4. Install the GitHub CLI and sign in with the browser (OAuth):

   ```sh
   brew install gh
   gh auth login --web
   ```

5. Set your Git identity, if you did not do this before. The sandbox uses it for commits:

   ```sh
   git config --global user.name "Your Name"
   git config --global user.email "you@example.com"
   ```

6. Tell `sbx` to read the GitHub token from `gh` when it needs it:

   ```sh
   sbx secret set github --command '/opt/homebrew/bin/gh auth token'
   ```

7. Put the wrapper on your `PATH`. From this folder, for example:

   ```sh
   mkdir -p ~/.local/bin && ln -sf "$PWD/bin/agents" ~/.local/bin/agents
   ```

You sign in to Claude in the sandbox (see "Sign in to Claude" below). Optional: `sbx secret set openai --oauth` uses your ChatGPT sign-in for Codex.

Alternatives: `sbx secret set anthropic` stores an Anthropic API key, and `sbx secret set github` stores a GitHub token.

## Start the sandbox

Go to the project folder that the agents work on. Then:

```sh
agents plan        # preview: kits, workspace, secrets, bindings
agents claude      # create the sandbox (first time) and attach to Claude Code
agents codex       # run Codex in the same sandbox
agents shell       # open bash in the sandbox
agents exec CMD    # run one command in the sandbox
agents stop        # stop the sandbox; its state stays
agents rm          # remove the sandbox and its provisioned token
```

The first `agents claude` shows the plan and asks for your approval. Then it builds the two local kits and creates the sandbox. The install hook of `kits/azure-devops` installs the Azure CLI, which takes approximately one minute. Later starts use the same sandbox and are fast. Each start asks again for approval of the host command that gets the Azure DevOps token.

The sandbox name is `agents-<project folder>`. Thus each project gets its own sandbox.

The project folder must be outside this repo. The agent can write to its workspace, and `bin/agents` and `sbxenv.yaml` run commands on your computer. `agents` stops when the current folder contains them.

### Sign in to Claude

Do this one time for each sandbox:

1. In Claude Code in the sandbox, run `/login`.
2. Select the Claude account (subscription) option.
3. Open the URL in your browser on the host and sign in.
4. Copy the code from the browser and paste it into the sandbox.

The sandbox proxy catches the token exchange. It keeps the real tokens on the host and renews them. The sandbox gets only sentinels in `~/.claude/.credentials.json`.

### Optional settings

Set these environment variables on the host:

```sh
AZDO_ORG=my-org AZDO_PROJECT=my-project agents claude   # defaults for `az devops`
CLAUDE_MODEL=claude-opus-5-5 CODEX_MODEL=gpt-6.1-sol agents claude
```

These settings apply when the sandbox is created. To change them, run `agents rm` and start again.

### Without the wrapper

```sh
sbx env run sbxenv.yaml \
  --name agents-myproject --env-arg workspace="$HOME/src/myproject"
```

Use the same `--name` and file for each `sbx env` command on that sandbox.

## Connect from Claude Desktop

Claude Desktop can run its Claude Code session in the sandbox, over SSH. Each local sandbox has the SSH host name `<sandbox name>.sbx`.

1. Set up SSH access one time on the host:

   ```sh
   sbx setup ssh
   ```

2. Create the sandbox and sign in to Claude (`agents claude`, then `/login`). The SSH connection does not give the sandbox a Claude credential.

3. Make sure that the connection works from a terminal:

   ```sh
   ssh agents-<project folder>.sbx
   ```

4. In Claude Desktop, open the environment list and select **+ Add SSH connection**. In **SSH Host**, enter `agents-<project folder>.sbx`. Leave **SSH Port** and **Identity File** empty.

5. Select the connection. Then select the project folder in the remote folder picker. The folder has the same path as on your computer. The picker can open at `/home/agent` first.

CAUTION: Claude Desktop can write Anthropic credentials into the sandbox when it renews the sign-in. Then the real Claude token is in the sandbox, and requests to Anthropic use it instead of the proxy. The GitHub and Azure DevOps tokens stay on the host.

Notes:

- The network rules also apply to this session. If a request is blocked, look at `sbx policy approval ls` on the host.
- If the connection stops when the Claude token expires, run `sbx run --name agents-<project folder>` on the host.
- `sbx setup ssh --auto-create` adds a ready connection "Docker Sandbox (Claude)" to Claude Desktop. That connection makes a different sandbox (`ssh-claude`), with no project folder and without the kits of this folder.

See [Connect Claude Desktop to a sandbox](https://docs.docker.com/ai/sandboxes/integrations/claude-desktop/) in the Docker docs.

## Demo: see the controls work

Open a shell in the sandbox with `agents shell`. The policy commands run on the host.

### The tools work, with no secret in the sandbox

```sh
claude --version && codex --version && gh --version && az version && git --version
gh api user --jq .login                          # your GitHub login, through the proxy
echo "$GH_TOKEN" "$AZURE_DEVOPS_EXT_PAT"         # placeholders, not your tokens
cat ~/.claude/.credentials.json                  # sentinels (after /login)
az devops project list --org https://dev.azure.com/<org> --output table
git ls-remote https://dev.azure.com/<org>/<project>/_git/<repo>
git config --global user.email                   # your Git identity
```

### The sandbox sees only the project folder

```sh
ls ~                       # the home folder of the sandbox, not yours
ls "$(dirname "$PWD")"     # only the project folder; your other folders are not there
```

### A host that no rule allows is blocked

```sh
curl -s https://example.com
```

The request fails. The answer names the host and tells you to look at the approval requests. On the host:

```sh
sbx policy approval ls                           # the request for example.com
sbx policy log agents-<project folder>           # allowed and blocked requests
```

You can approve the host for this sandbox (`sbx policy approval respond <id> --option allow`), or do nothing and keep it blocked. Then ask the agent for the same thing, for example: "Get https://example.com with curl and tell me the result."

### A rule can allow a host for some requests only

```sh
curl -s -o /dev/null -w '%{http_code}\n' https://registry.npmjs.org/left-pad   # 200: GET is allowed
curl -s -X POST https://registry.npmjs.org/                                    # refused: POST is not allowed
gh api -X DELETE repos/<your GitHub login>/no-such-repo                        # HTTP 403: the deny rule
```

The last request is safe: the repository does not exist. The proxy answers 403, and GitHub never gets the request. Without the rule, GitHub answers 404. `sbx policy log` shows the three requests.

## How the credentials work

The sandbox never gets a real secret.

- Claude Code: after `/login` in the sandbox, the proxy holds the claude.ai OAuth tokens. The sandbox sees sentinels. With an `anthropic` API-key secret, the kit uses that key instead.
- GitHub: the global `github` secret runs `gh auth token` on the host when the proxy needs a value. The sandbox sees a sentinel in `GH_TOKEN`.
- Codex uses the global `openai` secret, if you set it. The sandbox sees a sentinel in `OPENAI_API_KEY`.
- Azure DevOps: `kits/azure-devops` declares a credential for the service `azure-devops`. The sandbox gets a sentinel in `AZURE_DEVOPS_EXT_PAT`. On each request to `dev.azure.com`, `*.dev.azure.com` or `*.visualstudio.com`, the proxy sets `Authorization: Bearer` with your Entra ID token. This covers `az devops`, `git` over HTTPS and `curl` to the REST API.
- `sbxenv.yaml` provisions the `azure-devops` secret for this sandbox only. A host command (`az account get-access-token`) gets it from your `az login` each 5 minutes. `agents rm` deletes it.

A secret and its use are two steps. The `bindings` in `sbxenv.yaml` approve the hosts where the proxy may use each secret. `sbx` keeps them in `~/.config/sbx/credentials.yaml`, also after `agents rm`.

If `az login` on the host expires, Azure DevOps calls in the sandbox fail with 401. Run `az login` on the host again.

Use HTTPS remotes for Azure DevOps. SSH to `ssh.dev.azure.com` is blocked, because the proxy cannot add a credential to SSH.

## Network egress

With the Locked Down preset, the sandbox can reach only the hosts that a kit allows:

- The model APIs of Anthropic and OpenAI.
- GitHub (`github.com`, `api.github.com`, `uploads.github.com`, release downloads).
- Azure DevOps (`dev.azure.com`, `*.dev.azure.com`, `*.visualstudio.com`).
- Package registries, read-only (`GET` and `HEAD`): npm, PyPI, NuGet, Go, crates.io, Debian.

Deny rules block `DELETE` under `/repos/` on the GitHub API, and `DELETE` on projects and repositories in Azure DevOps. A deny rule wins over each allow rule.

The preset changes this list, because allow rules add up:

| Preset | `sbx policy init` | Effect on this sandbox |
|---|---|---|
| Locked Down | `deny-all` | Only the hosts above. Use this preset. |
| Balanced | `balanced` | Also the hosts of the preset: package managers, code hosts, container registries and more. The read-only rule for the registries does not hold if the preset allows the same host for all methods. |
| Open | `allow-all` | All hosts. Only the deny rules stay. |

`sbx policy ls` shows the rules that apply. `sbx policy reset` lets you select the preset again, but it deletes your local rules and stops the running sandboxes.

To allow one more host, run one of these commands on the host:

- For all sandboxes: `sbx policy allow network <host>`.
- For one sandbox: `sbx policy allow network --sandbox agents-<project folder> <host>`.

To allow a host permanently in this kit, add it to `kits/agent-workbench/agent-workbench.yaml` and create the sandbox again.

## What the sandbox does not stop

- **An allowed host is a way out.** The agent has your rights on GitHub and Azure DevOps. It can push the code to another repository there, or put text in an issue. The allowlist names hosts, not repositories.
- **The project folder is shared.** The agent can change each file in it, also Git hooks (`.git/hooks/`), CI files, build scripts and `.claude/` settings. Review the changes before you commit, build or open the folder in an editor.
- **The agents do not ask.** Claude Code runs in bypass-permissions mode and Codex with `approval_policy = "never"`. The sandbox is the boundary, not the agent.
- **The deny rules are narrow.** They block `DELETE` on some paths. Each other write that your account can do stays possible. Keep branch protection and review rules on the server.
- **Claude Desktop can bring the Claude token into the sandbox.** See "Connect from Claude Desktop".
- **Model output is not checked.** The sandbox limits what a prompt injection can do. It does not stop a prompt injection.

## Change the kits

- Validate a local kit: `sbx kit validate ./kits/azure-devops`.
- Build a local kit without `sbx`: `docker buildx build -f kits/azure-devops/azure-devops.yaml -t azure-devops:dev kits/azure-devops`.
- Show what `sbx` applies: `sbx kit inspect ./kits/azure-devops --resolved`.
- To use newer agent versions, change the tags in `sbxenv.yaml`. The tags are on Docker Hub (`docker/sbx-kit-claude`, `docker/sbx-kit-codex-mixin`, `docker/sbx-kit-gh`).

Kit changes apply when a sandbox is created. Run `agents rm` and start again.
