# workshop-ai-security

A Claude Code plugin marketplace for a workshop in AI security and guardrails. It has one mod (a function-hook plugin), `plugins/security-advisor/`. `.claude-plugin/marketplace.json` lists it.

## The purpose of security-advisor

security-advisor is a harmless "malicious plugin" demo. It poses as a security advisor for skills. In fact it blocks every prompt and shows a fake ransomware screen ("You've been PWNED!"). The "pay ransom" button shows the lesson: read a plugin before you install it. The mod does not read, encrypt or send any data.

Keep the disguise:

- The README, `plugin.json` and `marketplace.json` must describe the mod only as a security advisor for skills. Do not hint at what it really does.
- The code comments state the truth. Keep them that way: a participant who reads the source must find out.
- Slash commands must always go through, so that `/plugin uninstall security-advisor@ai-security-workshop` works.

## Release a change to the mod

1. Bump the version in `plugins/security-advisor/.claude-plugin/plugin.json`.
2. Run `claude plugin validate .` and `claude plugin validate plugins/security-advisor`.

`marketplace.json` has no version field. Do not change it for a version bump.

The mod has no tests and no settings, by request. A temporary test for a check is permitted. Remove it after the check.

## Gotchas

### The API types are not always correct about surfaces

The comments in the plugin API types can be out of date. For example, build 2.1.310 says that `AbovePrompt` is "Raised on the terminal and desktop surfaces only". That is not true: the VS Code extension raises `AbovePrompt` under the surface name `"vscode"`, and it draws `Svg` (as an image, because it does not use `isInteractive`).

When the types and the behaviour that the user sees do not agree, search the installed host bundle:

```sh
grep -oE ".{100}AbovePrompt.{150}" ~/.vscode/extensions/anthropic.claude-code-*/extension.js
grep -oE ".{100}case\"Svg\".{100}" ~/.vscode/extensions/anthropic.claude-code-*/webview/index.js
```

### A passing test does not prove that the host draws a component

In `claude plugin test`, `$.ui.mount({ surface, component })` raises any component on any surface that the test names. It only validates the tree against the element table of that surface.

- For a change that applies to one surface, make sure that the real host raises the component (see the gotcha above).
- An assertion such as "the terminal draws 0 `Svg`" can never fail, because the terminal has no `Svg` element. Do not use it as proof.
- A test of the pane must answer `clock.every` (for example `on('clock.every', () => ({ value: undefined }))`), because the terminal animation uses a timer.

### `tsc -p plugins/security-advisor` fails on a fresh checkout

The mod's `tsconfig.json` extends `./.claude-plugin/types/tsconfig.json`. That folder is not in git, because the engine writes it only when it loads the mod from a folder that the user owns.

To type-check without it, write a scratch `tsconfig.json` outside the repo:

- Copy the `compilerOptions` from the header of the bundled `claude-code.d.ts` (in the `plugin-authoring` skill's `types/` folder).
- In `include`, put the path of that `.d.ts` and the absolute paths of the mod's `hooks` and `types` folders.
- Run `npx -y -p typescript@5.6.3 tsc -p <scratch tsconfig>`.

### Visual check of the pixel art without the live host

A session cannot reload an installed marketplace plugin, and it cannot take a screenshot of the Desktop or VS Code UI.

To see the SVG, write it to a file and make a PNG of it:

1. Write a scratch `gen.mts` that imports `pwnedSvg` from `plugins/security-advisor/hooks/art.ts` and writes its result to `pwned.svg`.
2. Run `node --experimental-strip-types gen.mts`.
3. Run `qlmanage -t -s 1000 -o . pwned.svg`. The PNG shows one frame only, with no SMIL animation.

To see the full pane tree for a surface:

1. Add a temporary test that mounts the pane and prints `console.log('@@DUMP <name> ' + JSON.stringify(await ui.drawn()))`.
2. Run `claude plugin test plugins/security-advisor | grep @@DUMP > dump.txt`. Then remove the temporary test.
3. Use a small Node script to render the trees as HTML: `Box` as a flex `div`, `Text` as a `span`, `Svg` as an `<img>` with a base64 `data:image/svg+xml` source.
4. Take a screenshot with headless Chrome:
   `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --window-size=820,1000 --screenshot=out.png file://<path>.html`

This shows the tree that the mod draws, not the live host. Say so when you report the result.
