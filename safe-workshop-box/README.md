# Safe Workshop Box

A dev container is a **separate little computer inside your laptop**. Your code and Claude Code
work in there, not directly on your laptop.

Think of it like a **hotel room**:

| Hotel room | Dev container |
|---|---|
| Every room looks the same | Everyone gets the same tools and versions |
| You only have your room, not the whole building | Only your project folder is shared, nothing else from your laptop |
| The door only opens for people on the guest list | The firewall only allows a few websites |
| Your things stay in the locker at reception | Your Claude login is kept in a volume and survives a rebuild |

Claude Code lives in this room too. Whatever it does, it stays inside the room.

## The 3 files

```
.devcontainer/
├── Dockerfile          the recipe: what is installed in the room
├── devcontainer.json   the instructions: how VS Code builds and opens the room
└── firewall.sh         the guest list: which websites are allowed
```

## How to open it

1. Install **Docker Desktop** and **VS Code** with the **Dev Containers** extension.
2. Open the `safe-workshop-box` folder in VS Code (this folder, not the whole repo).
3. Click **"Reopen in Container"** (or press `Cmd/Ctrl+Shift+P` and run *Dev Containers: Reopen in Container*).
4. Wait until the terminal shows `Firewall is ON`.

## Try it yourself

Open a terminal in VS Code (inside the container) and run:

| Command | What you'll see | What it shows |
|---|---|---|
| `node --version` | `v20...` for everyone | Same room for everyone |
| `ls ~/Documents` | `No such file or directory` | Your laptop's files are not here |
| `curl https://github.com` | A web page | On the guest list |
| `curl https://google.com` | `Couldn't connect` | Not on the guest list |

## Use Claude Code

1. In the terminal, type `claude`.
2. Log in: open the link it shows in your normal browser and paste the code back.
3. Ask Claude to fetch google.com and see what happens.

## Challenge

Add `google.com` to `ALLOWED_SITES` in `firewall.sh`, then run
*Dev Containers: Rebuild Container*. Can you reach google.com now?

## Good to know

- Claude Desktop cannot connect to this container, because it has no SSH server. To use
  Claude Desktop, use the [demo devcontainer](../.devcontainer/README.md#connect-from-claude-desktop-ssh)
  at the repo root.
- A dev container is a strong fence, not a perfect wall. It protects you from mistakes and
  misbehaving tools, not from a skilled attacker.
- Changes in your project folder are real. Use Git, so you can undo what Claude changes.
- Anthropic publishes a stricter version of this setup:
  <https://github.com/anthropics/claude-code/tree/main/.devcontainer>
