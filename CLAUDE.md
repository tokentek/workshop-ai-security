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
3. Run `claude plugin test plugins/security-advisor`. All tests must pass.
4. Do a visual check of each surface that the change touches (see "Visual check of the pixel art" below).

`marketplace.json` has no version field. Do not change it for a version bump.

The mod has no settings, by request. Its tests are in `plugins/security-advisor/tests/screen.test.tsx`. A temporary test for a check (for example a tree dump) is permitted. Remove it after the check.

## What each surface draws

- **Desktop and mobile:** the band above the prompt, with the animated SVG (`pwnedSvg`).
- **VS Code:** the band above the prompt, with the pixel art as rows of coloured `Box` runs (`pwnedRaster` and `spans`). Never an `Svg` (see the gotcha below).
- **Terminal:** a pane with the full screen and the band with a compact strip, both in half-block cells (`pwnedRaster` and `halfBlocks`). The mod opens the pane only when `$.session.surfaces()` has `terminal`.
- **Keyboard lock (terminal only):** after the first blocked prompt, a `prompt.edit` hook empties the box on each key that adds text, and opens the pane again with `focus: true` to ask for the keys. A draft that starts with `/` still types. "Pay ransom" ends the lock. The pay button has no hotkey, so that a typed "p" in the pane does not pay.

### The terminal puts a dropped prompt back in the box

After a `prompt.submit` hook answers `{ drop }`, the terminal keeps the dropped text in the prompt box. The mod empties the box with `$.prompt.fill({ text: '' })` 100 ms after the drop. Without this, slash commands cannot start with `/`, and a pane never gets the keys (a pane takes them only over an empty prompt).

### The terminal applies a key before `prompt.edit` answers

The editor shows each key at once and raises `prompt.edit` in the background, with a 50 ms budget. It applies the hook's answer only if the answer still fits the draft; otherwise it logs "a rewrite no longer fits the draft (it moved meanwhile); the person's typing stands". Keep the `prompt.edit` hook fast.

### Test the keyboard lock in the real CLI

`claude plugin test` cannot show what the editor does with an answer. To test in the real CLI:

1. Write an `expect` script that runs `claude --debug-file <log> --plugin-dir plugins/security-advisor --settings <file>`. In the settings file, put `{"enabledPlugins":{"security-advisor@ai-security-workshop":false}}` so that the installed copy does not load too.
2. Run it in a scratch folder. The first run shows the workspace trust question: send the down arrow and Enter.
3. Send keys one at a time with a short `sleep`: a prompt and Enter, some letters, Esc, then `/exit` and Enter.
4. Read the log (`prompt.edit`, `prompt.fill`, `typing stands`) and strip the escape codes from the output to see the prompt line.

### No surface lets a plugin disable the prompt box

The plugin API has no call to disable or hide the prompt input. Only the terminal raises `prompt.edit` (the VS Code bundle has no reference to it). In VS Code, `$.ui.focus` cannot take the keyboard from the prompt (it refuses a site that does not hold the keys), and the webview drops `Input` `autoFocus`. The test types (build 2.1.312) do not have `$.prompt.edit`, but the kit raises it at run time: the tests use a small cast helper.

## Gotchas

### The API types are not always correct about surfaces

The comments in the plugin API types can be out of date. For example, build 2.1.310 says that `AbovePrompt` is "Raised on the terminal and desktop surfaces only". That is not true: the VS Code extension raises `AbovePrompt` under the surface name `"vscode"`.

### VS Code does not draw `Svg`: it shows only the alt text

The `vscode` element table has `Svg`, but the webview (build 2.1.312) draws the picture in a sandboxed `srcdoc` iframe. Before it draws, it checks that the iframe runs in a different process (a busy-loop handshake, `spinTicks`). In the VS Code webview the iframe runs in the same process, so the check fails, the picture is refused (`late`, then `blind`), and the webview shows the `alt` text. The content of the SVG has no effect on this. In Chrome, which isolates sandboxed iframes, the same code draws the SVG.

Also, a `Markdown` image shows only its alt text, and `Text` `size` has no effect in VS Code. A `Box` takes fractional `width` (in `ch`) and `height` (in `lh`) and a `backgroundColor`, so the mod draws its pixels as boxes. The band in VS Code is at most `12lh` tall and scrolls what is taller.

When the types and the behaviour that the user sees do not agree, search the installed host bundle:

```sh
grep -oE ".{100}AbovePrompt.{150}" ~/.vscode/extensions/anthropic.claude-code-*/extension.js
grep -oE ".{100}case\"Svg\".{100}" ~/.vscode/extensions/anthropic.claude-code-*/webview/index.js
```

### A passing test does not prove that the host draws a component

In `claude plugin test`, `$.ui.mount({ surface, component })` raises any component on any surface that the test names. It only validates the tree against the element table of that surface.

- For a change that applies to one surface, make sure that the real host raises the component (see the gotcha above).
- An assertion such as "the terminal draws 0 `Svg`" can never fail, because the terminal has no `Svg` element. Do not use it as proof.
- A test that blocks a prompt must call `mock.clock(on)`, because the animation starts a timer. A stub such as `on('clock.every', () => ({ value: undefined }))` lets the real timer run, and its late `$.state.set` fails the test file ("a rejection nothing handled"). With `mock.clock`, `await clock.advance(250)` moves the animation one frame.

### `tsc -p plugins/security-advisor` fails on a fresh checkout

The mod's `tsconfig.json` extends `./.claude-plugin/types/tsconfig.json`. That folder is not in git, because the engine writes it only when it loads the mod from a folder that the user owns.

To type-check without it, write a scratch `tsconfig.json` outside the repo:

- Copy the `compilerOptions` from the header of the bundled `claude-code.d.ts` (in the `plugin-authoring` skill's `types/` folder).
- In `include`, put the path of that `.d.ts` and the absolute paths of the mod's `hooks`, `types` and `tests` folders.
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
   - For VS Code, map `Box` sizes as the webview does: `width` in `ch`, `height` in `lh`, `gap` as `lh` down and `ch` across. Put the tree in a `div` with `max-height:12lh; overflow:auto`, in a 13px `system-ui` font.
   - For the terminal, use a monospace font, and draw each `▀`/`▄` as a cell with a two-colour `linear-gradient` background (top colour 50%, bottom colour 50%).
4. Take a screenshot with headless Chrome:
   `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --window-size=820,1000 --screenshot=out.png file://<path>.html`

This shows the tree that the mod draws, not the live host. Say so when you report the result.
