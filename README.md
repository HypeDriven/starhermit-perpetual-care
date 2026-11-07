# Perpetual Care

“Your recovery is our recurring revenue.”

A single-player, darkly comic hospital management game built entirely with StarHermit Engine 1.38.0. All patients, ailments, insurers, and interventions are fictional game abstractions.

Play on StarHermit: https://825eaedf-a936-4e1e-a4d3-74f8ef652d61.starhermit.com/index.html

## Play

Begin with **Resume**. Keep patients alive and in the 35–75 vitality range to earn a billing bonus. Use **Stabilize** to raise vitality and **Observe** to let it drift down. Above 88, patients eventually recover and leave. At zero, they die. Bill $300,000 over seven days, survive audits, and avoid three deaths, bankruptcy, or 100% scrutiny.

Admit waiting patients, expand the east wing, hire nurses, optimize billing, and fund compliance. Corporate events offer recurring dilemmas. Each day lasts 80 seconds at 1×. Progress saves locally every six seconds and on suspend/quit. Loading a saved run pauses it.

**Controls:** click/tap beds and buttons; Space pauses; 1/2/3 changes selected care; Tab selects the next patient; F changes speed; H opens the handbook. The **Options** button or F1 opens the engine's shared graphics, audio, language, and control settings. The simulation pauses while Options is open or the game loses focus. On phones, tap a bed to open Patients.

## Native development

Download the engine from https://wiki.starhermit.com/docs/tutorials/starhermit-engine.html, then run:

```sh
starhermit .
starhermit check .
starhermit package --web . --out dist
starhermit package --native .
node --test tests/model.test.mjs
```

`npm run check` validates with the published 1.38.0 runtime. `npm run package` rebuilds the root web loader and file index for publication; set `STARHERMIT` if the runtime is installed elsewhere. Commit the generated files before publishing with `~/games/tools/upload-game.mjs`. Its `publication.json` receipt identifies the game for subsequent updates and stays outside the playable package.

Library art is `cover.jpg`, derived from `coverart.png`. The matching favicon is supplied as SVG, PNG, ICO, and an Apple touch icon. Cover art was generated with the built-in imagegen tool using the prompt saved in `tools/cover-prompt.txt`.

The library cover is also uploaded through `PUT /api/v1/me/github-games/{id}/cover` (`imageBase64` in JSON), since the bundle manifest's relative cover path returned a placeholder. An uploaded cover overrides the manifest; replace it through that endpoint whenever the artwork changes.

The repository root is a complete StarHermit package: `starhermit.txt`, the engine entry `src/main.js`, and the generated browser loader `index.html`. Import this repository into StarHermit or host its root over HTTPS. To serve locally, use `python3 -m http.server 8000` and open `http://localhost:8000`. A rebuilt web distribution is written to `dist` by the packaging command above. Engine binaries are supplied by StarHermit and are not vendored. Source uses `starhermit:engine`, `starhermit:draw`, `starhermit:input`, and `starhermit:storage` directly. The simulation in `model.js` has no runtime dependencies.

## License

Perpetual Care uses the same license terms as [StarHermit Engine](https://github.com/HypeDriven/starhermit-engine): **PolyForm Noncommercial License 1.0.0**, with Hype Driven Development Inc.'s additional permission for games published on StarHermit.com, publicly available to play there, and kept in running order there. See [LICENSE](LICENSE) for the complete terms.
