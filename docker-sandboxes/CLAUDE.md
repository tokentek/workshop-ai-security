# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## The purpose of this folder

This folder holds Docker Sandboxes work for the AI security workshop. A Docker Sandbox runs an AI agent (for example Claude Code) in an isolated microVM, with a network policy and a mounted workspace. The repo-root `CLAUDE.md` covers the rest of the repo (the `security-advisor` mod).

The sandbox is the `sbx` alternative to `../safe-workshop-box/`, which is a VS Code dev container with an iptables allowlist. Both show the same lesson: run an agent in a separate room with a short list of allowed sites.

## Documentation

- Overview: <https://docs.docker.com/ai/sandboxes/>
- Kits (customize): <https://docs.docker.com/ai/sandboxes/customize>
- Author kits: <https://docs.docker.com/ai/sandboxes/customize/author/>
- CLI reference: <https://docs.docker.com/reference/cli/sbx/>
- Environment files (`sbx env`): <https://docs.docker.com/ai/sandboxes/configuration/environment-files/>
- Local network policy and presets: <https://docs.docker.com/ai/governance/local/>
- Kit v3 specification and examples: <https://github.com/docker/sandbox-kit-spec> (`docs/spec/SPEC-v3.md`, `schema/kit.schema.json`)

`docs.docker.com` and `hub.docker.com` are blocked in the dev container of this repo. The source of the docs is on GitHub, which is open: clone <https://github.com/docker/docs> and read `content/manuals/ai/sandboxes/`, `content/manuals/ai/governance/` and `data/sbx_cli/` (the CLI reference, one YAML file for each command).

The docs pages are short and link to subpages. When the docs do not give a syntax, use `sbx <command> --help`. The local CLI is the source of truth for the installed version.

## The `sbx` CLI

The machine has `sbx` v0.51.0 (`/opt/homebrew/bin/sbx`). The `kit`, `env`, `setup` and `skills` commands are experimental.

Sandbox commands:

```sh
sbx run claude                    # run Claude Code; mounts the current folder read-write
sbx run --name my-sandbox claude  # give the sandbox a name, or attach again to it
sbx run claude -- <agent args>    # put agent arguments after "--"
sbx run claude . ../other:/work:ro  # extra workspaces: PATH[:TARGET][:ro]
sbx create ...                    # create, do not attach (or: sbx run -d)
sbx ls
sbx exec -it my-sandbox bash      # same flags as docker exec, but no -d
sbx stop my-sandbox
sbx rm my-sandbox                 # deletes all content in the sandbox, not the host files
sbx                               # interactive dashboard (TUI)
```

Built-in agents: `claude`, `codex`, `copilot`, `cursor`, `devin`, `docker-agent`, `droid`, `gemini`, `kiro`, `opencode`, `shell`.

Other commands that matter for the workshop: `sbx policy` (network, filesystem and MCP policies), `sbx secret`, `sbx mcp`, `sbx diagnose`.

## Kits

A kit is a declarative YAML artifact that makes or extends a sandbox environment. It can add credentials, network policies, environment variables, startup commands and files.

- A `workload` kit gives the base environment and the launch command.
- A `mixin` kit adds tools or behaviour to a workload.
- A `set` combines kits. Publication turns it into a workload or a mixin.

Kit commands:

```sh
sbx kit validate ./my-kit             # add --offline to skip the daemon policy and sign-in
sbx kit inspect ./my-kit --resolved   # shows what sbx applies, with the extends: parent merged
sbx run ./my-kit .                    # run a local workload kit (relative paths must start with ./ or ../)
sbx run claude --kit ./my-mixin       # add a mixin at start
sbx kit add my-sandbox ./my-mixin/    # add a mixin to an existing sandbox
sbx kit push ./my-kit <registry/repo:tag>
```

### Kit v2 and kit v3 have different layouts

- **v3** (the current format in the docs, needs `sbx` v0.45 or later): the descriptor is `<name>.yaml`, for example `my-kit/my-kit.yaml`. An optional recipe `my-kit.dockerfile` has the same stem. The first line must be `# syntax=docker/sandbox-kit:3`. The descriptor has `kind` but no top-level `name`: the reference gives the identity.
- **v2** (the older format): the descriptor is `spec.yaml` with an optional `files/` folder. `sbx kit pack` and the `--help` text of `sbx kit push` still describe this layout.

Recommended v3 layout:

```text
my-kit/
├── my-kit.yaml
├── my-kit.dockerfile
├── context.md
└── files/
    └── settings.json
```

Rules for v3 kits:

- All kits in one v3 sandbox must be v3. A v1 or v2 kit cannot go with a v3 kit.
- Since `sbx` v0.51.0, the built-in agent names (`claude`, `codex`) are published v3 kits (`docker.io/sbx/<name>:latest`) and take v3 mixins: `sbx run claude --kit ./my-mixin`. Before v0.51.0 they were v2 kits, and that command failed.
- `latest` moves. To pin an agent version, name the versioned workload instead, for example `docker.io/docker/sbx-kit-claude:<version>`. In an environment file, `agent:` is then the repository name (`sbx-kit-claude`). `sbxenv.yaml` does this.
- `install` hooks run one time, when `sbx` creates the sandbox. They get only the variables in their `env` list. `startup` hooks run on each start.
- Capabilities are in a `capabilities` list. Each entry has a `type` (for example `com.docker.sandbox/network-policy@1`) and, if necessary, a `config`. Set `optional: true` to let a runtime skip a capability that it cannot give.

### Example kits

Before you write a kit, read a similar example in the `examples/` folder of <https://github.com/docker/sandbox-kit-spec>. Each example has a `<name>.yaml` and usually a `<name>.dockerfile`. Useful examples:

- `hello`: the smallest workload.
- `claude`, `claude-mixin`, `claude-sessions`: Claude Code as a workload, as a mixin and with session state.
- `shell`, `alpine`, `ubuntu-docker`: base workloads.
- `gh`, `github-ssh`, `git-signing`, `docker-auth`: credentials and tools.
- `motd`, `dev-tools`, `tool`, `review-skill`, `skills-hub`: small mixins.
- `optional-cache`, `shared-cache`: optional capabilities and caches.
- `claude-acp-set`, `codex-acp-set`, `team`: kit sets.

The repo `sbxenv.yaml` is an example for `sbx env`. To run the examples from a local clone, do these steps in `examples/`:

```sh
sbx run ./hello --kit ./gh .
```

Note: `raw.githubusercontent.com` is blocked on this network (a 302 to a security gateway). Use `git clone` or the GitHub API (`curl https://api.github.com/repos/docker/sandbox-kit-spec/contents/examples`) instead.

Build a v3 kit image without `sbx`:

```sh
docker buildx build -f my-kit/my-kit.yaml -t my-kit:dev my-kit/
```

## The autonomous-agents environment in this folder

`sbxenv.yaml`, `kits/azure-devops`, `kits/agent-workbench` and `bin/agents` make one local sandbox with Claude Code, Codex, `gh` and the Azure CLI. `README.md` tells how to use it.

Facts about `sbx env` (v0.51.0) that the docs do not give:

- `${{ env.projectDir }}` is the folder of the env file, not the current folder. Thus the workspace is an env arg, and `bin/agents` passes `$PWD`.
- This folder has no cloud sandbox (`sbx --cloud`). It was removed to keep the demo simple. A cloud sandbox does not enforce HTTP method and path rules, cannot run a host command for a secret, and costs money. If you add one, it needs its own env file: `sbx --cloud env` refuses `workspace`, `sandboxOptions.pullPolicy`, and `secrets` or `bindings` for a custom service such as `azure-devops`, and a later env file cannot remove `workspace:` (`null` gives "path cannot be blank").
- `sbx env plan` works without `sbx login`. `sbx kit validate` and `kit inspect` need it. `docker buildx build -f <kit>.yaml` validates and builds a kit without sign-in.
- A kit `credential@1` with a custom service (`azure-devops`), a `Bearer %s` header and wildcard inject domains builds without errors, and `sbx env plan` accepts a `secrets:` entry that runs `az account get-access-token` for that service. A live sandbox (2026-11-09) confirmed the injection: `az repos list` on `dev.azure.com` and `git ls-remote` on `<organization>.visualstudio.com` work with no PAT.
- An install hook that runs as root (`user: "0"`) has `HOME=/home/agent`. If it runs a tool that writes a config folder there (for example `az`, which makes `~/.azure`), the folder belongs to root, and a later hook as `agent` fails with "Permission denied". Give the root call a temporary config folder, or `chown` the folder to `agent`.
- `sbx env run` without a terminal needs `-f` to approve the host commands (the `secrets:` command). `sbx -D` writes the full hook output, which the normal error ("failed to apply kit to sandbox") does not show.
- The user cannot create PATs. Azure DevOps uses the Entra ID token from the host's `az login`, GitHub uses `gh auth token` (`sbx secret set github --command`), and Claude uses `/login` in the sandbox (the kit's OAuth interception).

### Rules that keep the sandbox correct

- **The network preset decides what "allowlist" means.** Allow rules from the preset, the user and the kits add up, and a deny rule from any source wins. Only with the Locked Down preset (`sbx policy init deny-all`) does the sandbox reach only the hosts of the kits. With Balanced, the preset allows more hosts, and a kit rule that bounds a host to `GET` and `HEAD` does not hold if the preset allows that host for all methods. A request that no rule matches is blocked and makes an approval request (`sbx policy approval ls`).
- **A deny rule must cover each host that gets the credential.** The Azure DevOps token goes to `dev.azure.com` and to `*.visualstudio.com`, so the `DELETE` deny rule in `kits/azure-devops` names both, with the path forms of both. A deny entry may use a host pattern; a bounded allow entry may not.
- **The workspace must not contain this folder.** `bin/agents` and the `secrets` command in `sbxenv.yaml` run on the host, and the agent can write to its workspace. `bin/agents` stops if the current folder contains this folder.
- **Do not put a real delete in a demo.** The README demo sends `DELETE` for a repository that does not exist: the proxy answers 403, and without the rule GitHub answers 404.
- **`bin/agents` must run with GNU and BSD tools.** In a `tr` set, write `-` last (`'A-Za-z0-9_.\n-'`): GNU `tr` reads `.-\n` as a range and fails.

- **The Claude Desktop section of the README comes from the Docker docs, with no live test.** The source is `content/manuals/ai/sandboxes/integrations/claude-desktop.md` and `integrations/_index.md` in `docker/docs`. Keep the caution there: Claude Desktop can write the real Anthropic credentials into the sandbox.

### Test without `sbx`

The dev container has no `sbx` and no Docker. To test `bin/agents` there, put stub `sbx` and `az` scripts first on `PATH` (the `sbx` stub prints its arguments), and run each subcommand from a scratch folder, from the repo root (must stop) and with the `az` stub failing (must stop). A change to a kit or to an environment file needs a run on a machine with `sbx`: `agents rm`, `agents plan`, `agents claude`, then the demo commands in `README.md`.
