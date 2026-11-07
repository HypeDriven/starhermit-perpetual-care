# Perpetual Care

“Your recovery is our recurring revenue.”

Build, furnish and manage a hospital from an empty floor. A single-player hospital construction game inspired by the room-building and patient-flow design of classic hospital management games, with original art, fictional ailments and a gently cynical board of directors.

Play: https://825eaedf-a936-4e1e-a4d3-74f8ef652d61.starhermit.com/index.html

## Your first hospital

1. Choose **Rooms → GP office**. Drag a rectangle on the floor, or tap two opposite corners, then confirm the construction cost. Rooms need at least the listed dimensions. Keep the green entrance corridor clear.
2. Place a **Doctor desk** and an **Examination couch** inside. Furnishings occupy real floor tiles; leave room to walk from the door to every object. Rotate furnishings with R or the curved-arrow button.
3. Build and furnish a **Pharmacy** and a **Ward**. The first patients need either prescriptions or inpatient care.
4. Hire a **Doctor** and **two Nurses**. They automatically find rooms matching their roles. Open the hospital and press Play.
5. Patients check in at reception, queue for a GP, and walk to their prescribed treatment. Completed diagnoses and treatments earn income. Watch their patience and your queues.
6. Add waiting benches, plants, refreshments, toilets and a furnished staff room. Staff recover from fatigue during breaks. A caretaker maintains machines and cleanliness.

Cure six patients to unlock **Diagnostics**, then sixteen to unlock **Surgery**. Advanced departments need specialists. Your opening objective is thirty cures, five rooms and a reputation of at least 65. Completing it earns your first star and an $8,000 development grant. The hospital remains open as you work toward two and three stars.

Rooms can have their doors moved or be demolished at half their construction and furnishing cost. Corridor objects can be sold individually. Daily payroll and running costs are charged every three minutes at 1×. A $20,000 loan is available, with $200 daily interest; repay it when finances permit. Closing admissions stops arrivals while existing patients continue treatment.

The game saves after construction and management actions, every eight seconds, and on suspend or quit. Loading pauses the hospital. Version 2.1 upgrades existing version 2.0 saves in place, retaining buildings, staff, patients and finances. The original version 1 game's save remains in its separate slot.

## Management and hospital life

Open **Manage** or press **M**. Planning at this desk pauses the simulation; research, training and contract deadlines resume when you return to the hospital and play.

- **Patient needs:** patients seek drinks machines, visit usable toilets and reserve waiting places on benches. Each bench seats two. Refreshments bring a little income; bins prevent litter. Caretakers walk to rubbish and clean it. Crowding, thirst, toilet needs, expensive care and dirty surroundings reduce patience. Inspect patients to see these needs, their urgency and diagnostic confidence, or send someone home at a reputation cost.
- **Clinical decisions:** fast diagnoses shorten appointments at the cost of confidence; thorough diagnoses improve confidence. Treatment success depends on confidence, staff skill, fatigue, room upgrades, machine condition, cleanliness and research. An unsuccessful treatment leads to a second opinion without charging a treatment fee. Repeated unsuccessful care can cause a walkout.
- **Staff development:** employees have individual traits, experience, morale and three training courses. Courses temporarily remove their cover, then improve skill and salary. Pay rises improve morale and increase payroll. The People screen can swap employees between matching departments. Staff rooms have two rest places per sofa.
- **Research:** build a Research lab, fit its workstation and hire a Researcher. Fund one of six projects at a time. Researchers must be available and at their workstation. Projects improve diagnostic confidence, medicine, machine reliability, teaching, hospitality and precision care. A lab refit increases research output.
- **Room development:** refits improve quality, throughput and clinical performance, with twelve seconds of downtime. The first refit is available immediately; Reliable machines research unlocks levels III and IV. Pause a room's intake to finish existing care before refitting. Decor and generous floor space contribute to room quality. Upgraded lounges restore energy faster, and upgraded toilets serve visitors sooner.
- **Policies:** set fees to 80%, 100% or 125%; choose arrival-order or urgent-first clinical queues; adjust diagnostic thoroughness and preventive maintenance. Lower fees increase demand. Premium fees pay more but patients expect faster service. Preventive maintenance adds $100/day and repairs earlier.
- **Contracts:** after three cures, accept a community grant, a quality inspection or four urgent emergency referrals. Only one contract runs at a time. Each states its deadline, reward and penalty. Emergency contracts count only the referred patients; inspections require cleanliness and no walkouts or deaths. The main view keeps the active deadline visible.

The two-star goal adds seventy cures, 75 reputation, two discoveries and two trained employees. Three stars require 130 cures, 85 reputation, three completed contracts, five discoveries and three level-III rooms. Development grants are awarded once per rating. Daily reports show that day's income, expenses, cures and losses.

## Controls

| Action | Control |
| --- | --- |
| Draw a room | Drag, or tap two corners |
| Place / inspect | Click or tap |
| Cancel tool / close dialog | Escape or right click |
| Confirm construction | Enter or Build room |
| Rooms / furnishings / staff / inspect | B / E / H / V |
| Rotate furniture / camera clockwise | R or curved-arrow button |
| Rotate camera counterclockwise | Q |
| Cycle wall visibility | C or wall button |
| Pan | WASD / arrows; drag while using Select |
| Zoom | Wheel / pinch / + and − buttons |
| Pause / speed | Space / F |
| Handbook / save | F2 / F6 |
| Management desk | M or Manage |
| Engine settings | F1 or Options |

The responsive touch layout provides the same construction tools. Swipe the catalogue to reveal more entries. Engine Options owns graphics levels, audio volume, language and rebinding. Graphics changes apply live: shadow rendering, ambient occlusion, grading and antialiasing follow the engine's quality level. Simulation and walking animations stop while paused, unfocused or under the engine menu.

## Development and verification

The package runs natively and in browsers through **StarHermit Engine 1.38.0**. It has no runtime npm dependencies. `src/model.js` handles construction, navigation and hospital life; `src/management.js` handles development, policy and contracts; both are deterministic and independent of the engine. `src/catalogue.js` defines the content. `src/render.js` renders the hospital; `src/main.js` and `src/management-ui.js` provide its interface; `src/sound.js` plays audio on the engine's shared buses.

```sh
npm test                 # construction, routing, treatment, staffing, finances, saves
npm run check            # native package validation and 120 headless frames
npm run package          # rebuild browser loader and file index
npm run test:browser     # actual browser construction and durable save/restore
npm run test:management  # research, training, refits, policies and contracts
```

Set `STARHERMIT` to your engine executable if it is not in the standard `~/sh/runtime/1.38.0/` location. Browser checks use Playwright from this game or a neighboring project and the shared `~/games/tools/gpu-chrome.mjs` helper; `STARHERMIT_CHROME_HELPER` can override that helper.

`node tools/gen-play.mjs`, `node tools/gen-play.mjs --phone` and `node tools/gen-play.mjs --depth` regenerate the construction, touch and management play scripts. Native checks execute them with `starhermit . --render-check --guest --script tests/publish.play --quality molecular`, substituting `tests/phone.play` or `tests/management.play` as appropriate. They exercise the actual construction and management interfaces, run treatments and persist progress.

## Original assets

Six original textured furnishings were generated with the local **FLUX.2 Klein → TRELLIS** pipeline documented in `~/system`: desk, bed, medicine cabinet, scanner, sofa and plant. Runtime normalization fits them to their construction footprints and gives their nonmetal surfaces an appropriate material. The shell, walls, sanitary fixtures, vending machines, landscape and animated people are original procedural geometry.

`tools/generate-assets.py` records the reproducible prompts and seeds. Concept images and service receipts are in `tools/concepts/`; the playable models are in `assets/models/`. The original 65-second instrumental lounge soundtrack was generated by local **YuE2**. Its generation receipt is `tools/music-generation.json`; the normalized, faded Ogg is `assets/audio/hospital.ogg`. Interface and treatment cues are synthesized once with the engine's offline audio API. Source concepts, receipts, tests and tools stay outside the upload.

The existing `cover.jpg` library artwork and matching SVG/PNG/ICO favicon remain with the game. The library cover is also uploaded through the StarHermit owner cover endpoint, which overrides the bundle's relative manifest path.

## Publication

Rebuild and commit the package before publishing with `node ~/games/tools/upload-game.mjs .` using the account's configured StarHermit credentials. `publication.json` identifies the existing game for updates and records the source commit and archive checksum. It stays outside the playable package. Never create a second listing for an update.

## License

Perpetual Care uses the same license terms as [StarHermit Engine](https://github.com/HypeDriven/starhermit-engine): **PolyForm Noncommercial License 1.0.0**, with Hype Driven Development Inc.'s additional permission for games published on StarHermit.com, publicly available to play there, and kept in running order there. See [LICENSE](LICENSE) for the complete terms.
