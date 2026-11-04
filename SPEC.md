# Shaxmat 3D — Telegram Mini App (spec)

Build a **premium-looking 3D chess game** that runs as a Telegram Mini App (and in any mobile/desktop browser).
Original design — do not copy any existing chess product's branding or art. UI language: **Uzbek Latin**, always use
the proper letters `oʻ gʻ` (U+02BB) and `ʼ` (U+02BC), e.g. "Oʻyin", "Gʻalaba", "Taʼsir".

## Tech constraints
- Static site, **no build step**: `index.html`, `css/style.css`, `js/*.js` (ES modules), `assets/` only if really needed.
  Must work when served from a sub-path like `https://user.github.io/shaxmat3d/` (use relative URLs only).
- three.js via importmap from jsDelivr (pin a version, e.g. `three@0.170.0`, addons from `three/addons/`).
- Chess rules: chess.js ESM from jsDelivr (pin `chess.js@1.0.0`). Wrap it so the rest of the code uses a small API.
- AI: own engine in a **Web Worker** (`js/engine.worker.js`, can import chess.js or use own move gen): alpha-beta
  negamax + iterative deepening + quiescence + move ordering (MVV-LVA, killer moves) + piece-square tables,
  time-limited. 4 levels: Boshlovchi (depth 1 + random mistakes), Oʻrta (~0.5 s), Kuchli (~1.5 s), Usta (~3 s).
  UI must never freeze while the AI thinks (show a subtle "oʻylayapti…" indicator).
- Telegram WebApp: include `https://telegram.org/js/telegram-web-app.js`; call `ready()`, `expand()`,
  `disableVerticalSwipes()` if available, set header/background colors, use `HapticFeedback` (light impact on move,
  medium on capture, notification on check/mate), `BackButton` for closing modals. Everything must also work in a
  normal browser without Telegram (feature-detect, fall back to localStorage).
- Storage: `Telegram.WebApp.CloudStorage` when available, else localStorage: settings, unlocked items, current
  game (FEN + move history + mode + level) so a reload resumes the game, simple stats (wins/losses/draws per level).
- Mobile-first performance: cap devicePixelRatio at 2, a "Grafika: Yuqori / Oʻrta / Past" setting (shadows/bloom/
  particles off on Past), target 60 fps on mid-range phones. Pointer/touch input with raycasting; tap piece → tap
  square, and also drag-and-drop.

## 3D scene
- Procedural pieces (no external models): LatheGeometry profiles for pawn, rook (crenellated top), bishop (mitre with
  slit), queen (crown with balls), king (cross on top); knight = extruded/beveled horse-head silhouette on a lathe
  base. Smooth normals, nice proportions, visually readable from the default camera.
- Board: 8×8 squares with a beveled frame, file/rank labels (a–h, 1–8) on the frame, soft contact shadows,
  PBR materials (MeshPhysicalMaterial), environment lighting (RoomEnvironment/PMREM), subtle reflections.
- Camera: OrbitControls limited (no going under the board, limited zoom), smooth auto-rotation to the player's side,
  gentle idle sway. Toggle "2D koʻrinish" (top-down) for players who want it.

## Animations (the main selling point — make them juicy but fast, ~250–450 ms per move)
1. Intro: pieces drop onto the board in a wave with a small bounce; board fades/rises in.
2. Select: piece lifts slightly + glowing ring under it; legal target squares show glowing dots, capture targets
   show a red ring; last move squares tinted.
3. Move: pieces glide in a low arc with easing; knight jumps in a high arc; slight squash on landing + dust puff.
4. Capture: attacker strikes, captured piece shatters into particles (or dissolves with an emissive edge shader),
   small camera shake; captured pieces appear in the side tray.
5. Castling: king and rook move together in a choreographed motion.
6. Promotion: chooser UI (Farzin/Rux/Fil/Ot), pawn spins up in a light pillar and morphs into the new piece.
7. Check: king pulses with a red aura + warning sound/haptic.
8. Checkmate: losing king topples and rolls, slow cinematic camera orbit, confetti / light rays for the winner,
   then the result modal. Stalemate/draw: both kings glow neutral.
9. Undo: reverse animation.

## Themes & premium (monetization via Telegram Stars)
`js/config.js` exports `ITEMS` (id, name, type: 'board'|'pieces'|'effect'|'bundle', price in Stars,
`invoiceUrl` placeholder empty string) — the bot will fill invoice URLs later. Free: "Klassik yogʻoch" board+pieces.
Premium (locked with a 🔒 and price badge in the shop, previewable live on the board before buying):
- "Marmar" (white/black marble, gold trims)
- "Oltin & Obsidian" (gold vs obsidian, metallic, sparkles)
- "Neon" (dark board with emissive grid, glowing pieces, bloom)
- "Kristall" (glass/transmission pieces, ice board)
- "Samarqand" (turquoise/lapis tile board with Uzbek-style geometric ornament drawn procedurally on a canvas
  texture, gold-and-ivory pieces)
- Effects: "Olov" (fire capture), "Chaqmoq" (lightning capture), "Yulduzlar" (star trail on moves)
- Bundle: "Hammasi" (everything, discounted)
Buying: `Telegram.WebApp.openInvoice(item.invoiceUrl, status => …)`; on `paid` unlock immediately and save. If no
invoiceUrl / not in Telegram, show a friendly message. Also read unlocked ids from the URL query `own=id1,id2`
(passed by the bot) and merge them.
Extra premium perk: unlimited undo + "Maslahat" (hint = best move arrow from the engine) — free users get
3 undos and 1 hint per game.

## Screens / UI (glassmorphism over the 3D scene, smooth transitions, looks great on a phone in portrait)
- Home: logo "Shaxmat 3D", buttons: "🤖 Kompyuterga qarshi" (choose level + colour Oq/Qora/Tasodifiy),
  "👥 Doʻst bilan (bitta telefonda)", "🌐 Onlayn — tez orada" (disabled badge), "🎨 Doʻkon", "⚙️ Sozlamalar",
  "📊 Statistika". Continue button if a saved game exists.
- Game HUD: top bar with players (name from Telegram `initDataUnsafe.user.first_name`, "Kompyuter (Usta)"), captured
  pieces + material difference, whose turn, move list (SAN, scrollable, collapsible), buttons: Orqaga (undo),
  Maslahat (hint), Taslim (resign), Taklif: durang (vs friend), menu.
- Game over modal: result text ("Gʻalaba! 🎉", "Magʻlubiyat", "Durang"), reason (mat, pat, takror, 50 yurish,
  material yetishmasligi, taslim), buttons "Yana oʻynash", "Bosh menyu", "Doʻstlarga ulashish" (uses
  `Telegram.WebApp.switchInlineQuery('shaxmat', ['users','groups'])` if available).
- Settings: sound on/off, haptics on/off, graphics quality, show legal moves, 2D view, auto-rotate in friend mode,
  board coordinates on/off.
- Sounds synthesized with WebAudio (no files): move, capture, check, castle, win, lose, UI click.

## Quality bar
- No console errors. Handle all special rules (castling, en passant, promotion, threefold repetition, 50-move,
  insufficient material, stalemate) via chess.js.
- Clean, commented, modular code: `js/main.js` (app/UI flow), `js/scene.js` (three.js scene, board, pieces,
  themes), `js/anim.js` (tweens/particles), `js/game.js` (rules wrapper, state, storage), `js/ai.js` (worker
  client), `js/engine.worker.js`, `js/telegram.js`, `js/sound.js`, `js/config.js`, `js/i18n.js` (all strings).
- Add `tests/engine.test.mjs` runnable with `node tests/engine.test.mjs` that checks the engine finds a mate-in-1
  and mate-in-2, never returns an illegal move from 20 random positions, and a perft(3) sanity check of the wrapper.
- Write a short `README.md` (how to run locally: `npx serve .` or `python -m http.server`).
