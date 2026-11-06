# Autonomous agents sandbox

This folder gives a Docker Sandbox for autonomous coding agents. The sandbox is an isolated microVM. It has Claude Code and Codex, `gh` and `git`, and the Azure CLI for Azure DevOps. Egress goes through an allowlist. The real credentials stay on the host: the sandbox sees only sentinels, and the sandbox proxy adds the real values.

## What is in the sandbox

`sbxenv.yaml` puts these kits together:

| Kit | Source | What it adds |
|---|---|---|
| Claude Code (workload) | `docker.io/docker/sbx-kit-claude:2.1.316` | `claude` in bypass-permissions mode, Anthropic egress and credential |
| Codex | `docker.io/docker/sbx-kit-codex-mixin:0.166.0` | `codex` with `approval_policy = "never"`, OpenAI egress and credential |
| GitHub CLI | `docker.io/docker/sbx-kit-gh:2.103.2` | `gh`, GitHub egress, `GH_TOKEN` sentinel. Repository deletes are blocked. |
| Azure DevOps | `kits/azure-devops` (local) | `az` with the `azure-devops` extension, git over HTTPS, the PAT as Basic auth. Repository and project deletes are blocked. |
| Agent workbench | `kits/agent-workbench` (local) | Your Git identity, read-only egress to package registries, working rules for the agents |

The Docker kit images are the official v3 kits. The two local kits follow the [kit v3 specification](https://github.com/docker/sandbox-kit-spec/blob/main/docs/spec/SPEC-v3.md).

The environment files:

- `sbxenv.yaml`: the common base (agent, kits, size, GitHub binding).
- `sbxenv.local.yaml`: a local sandbox. It mounts your project folder and provisions the Azure DevOps PAT.
- `sbxenv.cloud.yaml`: a Docker cloud sandbox. It has no host folder.

`bin/agents` is a small wrapper. It gives the files, your project folder and a fixed sandbox name to `sbx env`.

## One-time setup

1. Sign in to Docker:

   ```sh
   sbx login
   ```

2. Store the model credentials as global secrets. Do one or both:

   ```sh
   sbx secret set anthropic        # Anthropic API key (prompts for the value)
   sbx secret set openai --oauth   # ChatGPT sign-in for Codex (or: sbx secret set openai for an API key)
   ```

   Without an Anthropic secret, Claude Code asks you to run `/login` in the sandbox.

3. Store a GitHub token as a global secret:

   ```sh
   sbx secret set github           # prompts for a fine-grained token
   ```

4. Make a Personal Access Token (PAT) in Azure DevOps (User settings > Personal access tokens). Give it only the scopes that the agents need, for example Code (Read & write), Work Items (Read & write) and Build (Read & execute).

5. Store the PAT in the macOS Keychain. The command asks for the PAT, so the value is not in your shell history:

   ```sh
   security add-generic-password -a "$USER" -s sbx-azure-devops-pat -w
   ```

   To replace the PAT later, add `-U` to the same command.

6. Put the wrapper on your `PATH`, for example:

   ```sh
   ln -s "$PWD/bin/agents" /usr/local/bin/agents
   ```

## Start the sandbox

Go to the project folder that the agents work on. Then:

```sh
agents plan        # preview: kits, workspace, secrets, bindings
agents claude      # create the sandbox (first time) and attach to Claude Code
agents codex       # run Codex in the same sandbox
agents shell       # open bash in the sandbox
agents stop        # stop the sandbox; its state stays
agents rm          # remove the sandbox and its provisioned PAT
```

The first `agents claude` shows the plan and asks for your approval. Then it builds the two local kits and creates the sandbox. The install hook of `kits/azure-devops` installs the Azure CLI, which takes approximately one minute. Later starts use the same sandbox and are fast.

The sandbox name is `agents-<project folder>`. Thus each project gets its own sandbox.

Optional settings, as environment variables on the host:

```sh
AZDO_ORG=my-org AZDO_PROJECT=my-project agents claude   # defaults for `az devops`
CLAUDE_MODEL=claude-opus-5-5 CODEX_MODEL=gpt-6.1-sol agents claude
```

These settings apply when the sandbox is created. To change them, run `agents rm` and start again.

### Without the wrapper

```sh
sbx env run sbxenv.yaml sbxenv.local.yaml \
  --name agents-myproject --env-arg workspace="$HOME/src/myproject"
```

Use the same `--name` and files for each `sbx env` command on that sandbox.

## Check that it works

In the sandbox (`agents shell`):

```sh
claude --version && codex --version && gh --version && az version && git --version
gh auth status                                   # GitHub, through the proxy
az devops project list --org https://dev.azure.com/<org> --output table
git ls-remote https://dev.azure.com/<org>/<project>/_git/<repo>
git config --global user.email                   # your Git identity
curl -sI https://example.com                     # blocked by the network policy
```

On the host:

```sh
sbx policy log agents-<project folder>           # allowed and blocked requests
```

## How the credentials work

The sandbox never gets a real secret.

- Claude Code, Codex and `gh` use the global `anthropic`, `openai` and `github` secrets. Their kits set sentinels in `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` and `GH_TOKEN`.
- `kits/azure-devops` declares a credential for the service `azure-devops`. The sandbox gets a sentinel in `AZURE_DEVOPS_EXT_PAT`. On each request to `dev.azure.com`, `*.dev.azure.com` or `*.visualstudio.com`, the proxy sets `Authorization: Basic` with the PAT as the password. This covers `az devops`, `git` over HTTPS and `curl` to the REST API.
- `sbxenv.local.yaml` provisions the `azure-devops` secret for this sandbox only. A host command reads it from the Keychain. `agents rm` deletes it.

Use HTTPS remotes for Azure DevOps. SSH to `ssh.dev.azure.com` is blocked, because the proxy cannot add a credential to SSH.

## Network egress

The sandbox can reach only the hosts that a kit allows:

- The model APIs of Anthropic and OpenAI.
- GitHub (`github.com`, `api.github.com`, `uploads.github.com`, release downloads).
- Azure DevOps (`dev.azure.com`, `*.dev.azure.com`, `*.visualstudio.com`).
- Package registries, read-only (`GET` and `HEAD`): npm, PyPI, NuGet, Go, crates.io, Debian.

Deny rules block `DELETE` on GitHub repositories and on Azure DevOps repositories and projects.

To allow one more host, run one of these commands on the host:

- For all sandboxes: `sbx policy allow network <host>`.
- For one sandbox: `sbx policy allow network --sandbox agents-<project folder> <host>`.

To allow a host permanently in this kit, add it to `kits/agent-workbench/agent-workbench.yaml` and create the sandbox again.

## Cloud sandbox

A cloud sandbox runs on Docker infrastructure. It has no host folder, so clone the repository in the sandbox.

CAUTION: A cloud env file cannot provision the custom `azure-devops` secret, and a cloud secret cannot read from the Keychain at use time.

1. Store the PAT one time as a cloud custom secret. The cloud proxy sets the header to the stored value, so store the Base64 of `:<PAT>`:

   ```sh
   security find-generic-password -s sbx-azure-devops-pat -w | tr -d '\n' \
     | (printf ':'; cat) | base64 \
     | sbx --cloud secret set-custom --name azure-devops --host dev.azure.com \
         --header Authorization --format 'Basic %s' --value-stdin
   ```

   Cloud custom secrets take exact host names only. Add one `--host` for each other host that you use, for example `--host vssps.dev.azure.com`.

2. Store the model and GitHub secrets for the cloud: `sbx --cloud secret set anthropic`, `sbx --cloud secret set github`, and so on.

3. Start the sandbox:

   ```sh
   agents cloud       # or: sbx --cloud env run sbxenv.yaml sbxenv.cloud.yaml
   agents cloud-rm    # remove it
   ```

Cloud sandboxes enforce the allowed hosts, but not the HTTP method and path rules. Thus the read-only registry rules and the `DELETE` deny rules apply only to local sandboxes.

## Change the kits

- Validate a local kit: `sbx kit validate ./kits/azure-devops`.
- Build a local kit without `sbx`: `docker buildx build -f kits/azure-devops/azure-devops.yaml -t azure-devops:dev kits/azure-devops`.
- Show what `sbx` applies: `sbx kit inspect ./kits/azure-devops --resolved`.
- To use newer agent versions, change the tags in `sbxenv.yaml`. The tags are on Docker Hub (`docker/sbx-kit-claude`, `docker/sbx-kit-codex-mixin`, `docker/sbx-kit-gh`).

Kit changes apply when a sandbox is created. Run `agents rm` and start again.
