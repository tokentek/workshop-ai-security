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
- Kit v3 specification and examples: <https://github.com/docker/sandbox-kit-spec> (`docs/spec/SPEC-v3.md`, `schema/kit.schema.json`)

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

- All kits in one v3 sandbox must be v3.
- Built-in agent names (`claude`, `codex`) select v2 kits. Thus `sbx run claude --kit ./some-v3-mixin` fails. Use a v3 workload instead, for example `sbx run docker.io/docker/sbx-kit-claude:<version> --kit ./my-mixin`.
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

`sbxenv.yaml` (base), `sbxenv.local.yaml` and `sbxenv.cloud.yaml` (overlays), `kits/azure-devops`, `kits/agent-workbench` and `bin/agents` make one sandbox with Claude Code, Codex, `gh` and the Azure CLI. `README.md` tells how to use it.

Facts about `sbx env` (v0.51.0) that the docs do not give:

- `${{ env.projectDir }}` is the folder of the env file, not the current folder. Thus the workspace is an env arg, and `bin/agents` passes `$PWD`.
- A later env file cannot remove `workspace:` (`null` gives "path cannot be blank"). Thus the base file has no workspace.
- `sbx --cloud env` refuses `sandboxOptions.pullPolicy`, and `secrets` or `bindings` for a custom service such as `azure-devops`. Keep these in `sbxenv.local.yaml`.
- `sbx env plan` works without `sbx login`. `sbx kit validate` and `kit inspect` need it. `docker buildx build -f <kit>.yaml` validates and builds a kit without sign-in.
- A kit `credential@1` with a custom service (`azure-devops`), a `Bearer %s` header and wildcard inject domains builds without errors, and `sbx env plan` accepts a `secrets:` entry that runs `az account get-access-token` for that service. A live sandbox (2026-11-09) confirmed the injection: `az repos list` on `dev.azure.com` and `git ls-remote` on `stenait.visualstudio.com` work with no PAT.
- An install hook that runs as root (`user: "0"`) has `HOME=/home/agent`. If it runs a tool that writes a config folder there (for example `az`, which makes `~/.azure`), the folder belongs to root, and a later hook as `agent` fails with "Permission denied". Give the root call a temporary config folder, or `chown` the folder to `agent`.
- `sbx env run` without a terminal needs `-f` to approve the host commands (the `secrets:` command). `sbx -D` writes the full hook output, which the normal error ("failed to apply kit to sandbox") does not show.
- The user cannot create PATs. Azure DevOps uses the Entra ID token from the host's `az login`, GitHub uses `gh auth token` (`sbx secret set github --command`), and Claude uses `/login` in the sandbox (the kit's OAuth interception).
