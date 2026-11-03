---
name: ComboCard
description: A calm dark table where the 1875 cards are the only light, and the table takes the colour of the last suit drawn.
colors:
  notte-950: "#070b1f"
  notte-900: "#0b1130"
  notte-800: "#0f1737"
  notte-700: "#18224d"
  notte-600: "#232f66"
  linea: "#2a356b"
  linea-forte: "#4a5aa6"
  testo: "#f4f1ea"
  testo-2: "#b7bfdc"
  testo-3: "#8b94bb"
  carta: "#f7f1e1"
  carta-2: "#e9dfc4"
  oro: "#ffcf4a"
  oro-dark: "#e6b52e"
  inchiostro: "#1a1208"
  denari: "#ffcf4a"
  coppe: "#ff6a55"
  spade: "#6f97ff"
  bastoni: "#3ddc97"
  errore-dark: "#e0503c"
typography:
  titolo:
    fontFamily: "Bricolage Grotesque Variable, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  numeri:
    fontFamily: "Bricolage Grotesque Variable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.25
rounded:
  tab: "4px"
  tile: "8px"
  button: "12px"
  surface: "20px"
  seal: "9999px"
spacing:
  grid-gap: "3px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  target: "44px"
  action: "52px"
components:
  button-primary:
    backgroundColor: "{colors.oro}"
    textColor: "{colors.inchiostro}"
    rounded: "{rounded.button}"
    padding: "8px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.oro-dark}"
  button-action:
    backgroundColor: "{colors.oro}"
    textColor: "{colors.inchiostro}"
    rounded: "{rounded.button}"
    height: "52px"
  button-secondary:
    backgroundColor: "{colors.notte-700}"
    textColor: "{colors.testo}"
    rounded: "{rounded.button}"
    padding: "8px 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.notte-600}"
  button-outline:
    backgroundColor: "{colors.notte-700}"
    textColor: "{colors.testo}"
    rounded: "{rounded.button}"
    height: "44px"
  surface:
    backgroundColor: "{colors.notte-800}"
    rounded: "{rounded.surface}"
  input:
    backgroundColor: "{colors.notte-950}"
    textColor: "{colors.testo}"
    rounded: "{rounded.button}"
    padding: "12px 16px"
  card-tile:
    backgroundColor: "{colors.carta}"
    rounded: "{rounded.tile}"
    height: "44px"
  progress-tab:
    backgroundColor: "{colors.notte-600}"
    textColor: "{colors.testo}"
    rounded: "{rounded.tab}"
  progress-tab-complete:
    backgroundColor: "{colors.oro}"
    textColor: "{colors.inchiostro}"
  header:
    backgroundColor: "{colors.notte-800}"
  toast-win:
    backgroundColor: "{colors.oro}"
    textColor: "{colors.inchiostro}"
    rounded: "{rounded.button}"
    padding: "12px 16px"
---

# Design System: ComboCard

## Overview

**Creative North Star: "The Cards Are the Light"**

ComboCard is a dark, calm table. The page ground is almost black blue, the surfaces on it are solid night blue, and the only light objects are the ivory cards of the 1875 deck. Everything else is quiet so that a drawn card, a sealed place, or a won collection is the brightest thing on screen. It is phone-first (390x844 is the reference) and built to be operated: a sticky header, the whole 4x10 sheet in view, a fixed action bar under the thumb.

The table is alive in one way. A soft radial glow at the top of the page takes the colour of the suit of the last drawn card (`--tinta`, a registered CSS `@property`, so it cross-fades over 900 ms between suits). The draw itself is a scene: the card flips over in the middle of the screen in a halo of its suit ink, then flies up into the header. The sheet keeps the layout of a tombola card (values down the rows, suits across the columns); the look is modern and luminous, the card art is vintage on purpose.

The world rejects the retired look: straw paper, double rules, poster slabs, cream and orange. It also has no blur or glass; depth comes from solid layers, a hairline and a light on the top edge.

**Key Characteristics:**
- Dark table (`notte-950` to `notte-600`), solid surfaces, no backdrop blur.
- Ivory card tiles are the only light objects.
- Four luminous suit inks carry meaning; gold carries action and reward.
- Titles and numbers in Bricolage Grotesque 800; text in the system sans.
- Drawn icons (lucide line icons, the lentil credit token, suit art); no emoji.
- Motion is staged for the draw and the win, and is removed under reduced motion.

## Colors

A night-blue ground with warm-white text, one gold voice for action, and four suit inks that are never used decoratively.

### Primary
- **Oro / Gold** (`oro`, #ffcf4a; hover `oro-dark` #e6b52e): the main action ("Estrai Carta", "Torna alla Hall"), the completed progress tabs, the focus ring, the win toast, the jolly banner, the lit winning cells, the text selection. Always carries dark text (`inchiostro`, #1a1208).

### Secondary (the four suits)
- **Denari gold** (#ffcf4a), **Coppe coral** (#ff6a55), **Spade electric blue** (#6f97ff), **Bastoni emerald** (#3ddc97). Each has a soft tint at 16-18% alpha for column heads. They colour: the suit name in the column head, the seal on a covered card, the reveal halo, and the table glow (glow alphas 0.22 / 0.24 / 0.26 / 0.20). Coral doubles as the error colour.

### Neutral
- **Notte 950** (#070b1f): page ground, input fill, backdrop at 50-70% alpha.
- **Notte 900** (#0b1130): scrollbar track.
- **Notte 800** (#0f1737): surfaces, header (at 95%), action bar, dialogs.
- **Notte 700** (#18224d): secondary buttons, row-number discs, the first-game guide, the waiting state.
- **Notte 600** (#232f66): hover of secondary, incomplete progress tabs, disabled buttons.
- **Linea** (#2a356b) hairline; **Linea forte** (#4a5aa6) stronger border and scrollbar thumb.
- **Testo** (#f4f1ea) warm white; **Testo 2** (#b7bfdc) and **Testo 3** (#8b94bb) the two muted levels (3 is for placeholders and disabled text).
- **Carta** (#f7f1e1) and **Carta 2** (#e9dfc4): card tiles.

### Named Rules
**The Cards Are the Light Rule.** Ivory is reserved for cards and card tiles. No panel, button or badge is ivory or white at rest.

**The One Gold Rule.** Gold means "act here" or "you earned this". One gold action per screen state; suit inks never stand in for it.

**The Suit Ink Rule.** A suit colour appears only where its suit is meant: head, seal, halo, glow. Never as a status colour (coral as error is the one shared case, and the credit token is a lentil, not a Denari coin, so gold-for-money never reads as the suit).

## Typography

**Display Font:** Bricolage Grotesque Variable (self-hosted via `@fontsource-variable/bricolage-grotesque`, fallback system-ui)
**Body Font:** system sans (system-ui, Segoe UI, Roboto, Helvetica Neue, Arial)

**Character:** Bricolage is warm and slightly idiosyncratic and speaks for titles and every number that matters (pot, credits, row numbers, card value). The system sans does the reading. Tabular numerals are on for the whole body.

### Hierarchy
- **Title** (800, `.titolo`, 20-24 px, 1.25, -0.01em, balanced wrap): dialog titles, screen headings, "Partita terminata".
- **Figure** (800, 16 px, 1.25): pot and credits in the header, row-number discs (12 px).
- **Subtitle** (800, 16-18 px): "Come si gioca", rule section headings.
- **Body** (400, 14 px, 1.625, pretty wrap): rules text, guide lines, hints; muted `testo-2`.
- **Label** (700, 13 px): column heads, row value names, header caption; 12 px for header terms ("Montepremi", "I tuoi crediti").
- **Tab** (700, 11 px): progress tabs `n/3` and `n/5`; the jolly tag is 10 px.

### Named Rules
**The Two Voices Rule.** Bricolage only for titles and numbers; running text and controls stay in the system sans.

## Layout

Phone: one column, 12 px page padding, `max-w-7xl` container. A sticky header (52 px card miniature, last card name, cards left, pot, credits, exit) sits above the sheet; the sheet fills a single `.superficie` with 10 px padding; a fixed bottom bar (`max-w-md`, `notte-800`, top hairline) holds the main action and the jolly banner. The page keeps 8 rem of bottom padding for it.

The cards already drawn sit in a closed `Disclosure` ("Carte uscite", count "N su 40") below the collections: 48 px thumbnails from `public/carte-mini`, the latest first, each with its name for screen readers (the name is printed if the picture is missing). It is closed by default so the sheet, the last card and the action keep sharing one screen.

Desktop (`lg`): two columns (26 rem sheet, fluid rest); the sheet is sticky at the top, the action moves into a panel under it and the bar is hidden.

The sheet is a real table: a 5.6 rem row-head column plus four equal suit columns, 3 px cell gaps, 44 px rows. Spacing is Tailwind's 4 px steps (8, 12, 16 common); the grid gap and 44/52 px targets are the fixed rhythm.

## Elevation & Depth

Tonal layering with one soft shadow vocabulary; no blur anywhere.

- **Surface** (`0 18px 40px -18px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)`): panels and dialogs: depth plus a light on the top edge.
- **Card** (`0 10px 24px -8px rgba(0,0,0,0.7)`): ivory tiles lift off the table.
- **Halo** (`0 0 0 1px rgba(255,255,255,0.08), 0 8px 30px -6px var(--alone, rgba(255,207,74,0.45))`): the win toast; the reveal uses `0 0 80px 10px` in the suit ink; seals glow with `0 0 14px` in their ink.
- Header uses `shadow-lg`; the action bar a `0 -6px 16px` upward shadow.

**The Solid Surface Rule.** Surfaces are opaque. Glow belongs to the table ground, the seal, the reveal and the win; never to ordinary panels.

## Shapes

Soft but not bubbly: surfaces 20 px, buttons and inputs 12 px, card tiles 8 px, progress tabs 4 px, the header card miniature 3 px, seals and row discs fully round. Empty places on the sheet are dashed outlines (`linea`), the language of "a place still to fill". Hairlines are 1 px `linea` or `linea-forte`; secondary buttons and the guide use 1-2 px `linea-forte`.

## Components

### Buttons
- **Primary:** gold fill, `inchiostro` text, 800-weight-bold label, 12 px radius, min 44 px, shadow-md; hover `oro-dark`. The main action bar button is 52 px and full width, with a cooldown fill (black 25%, linear 1 s) and an "Attendi Ns" label.
- **Secondary:** `notte-700` fill, `linea-forte` hairline, `testo`; hover `notte-600`.
- **Outline (gold in the brief, as built):** `notte-700` fill with 2 px `linea-forte` border; the gold ring appears on focus. Hover is `bg-white`, see limits.
- **Danger:** coral fill, white text.
- **Disabled:** `notte-600` fill, `testo-3` text, no border.

### The Sheet (Cartella)
The signature object. Header row: suit art plus suit name in its ink on a soft tint, 13 px. Each row: a numbered disc (1-10), the value name, and a progress tab. Each cell is an ivory tile with the card itself: a 54 px print of the real 1875 card (`h-10`, from `public/carte-mini/`) on the left and, on the right, the number of its row (1-10, the same as the row disc) in a dark ink; the 15 places not held are dashed empties (drawn-but-not-held shows a small dot). When a held card is drawn a **seal** closes it: the tile dims under `notte-950` at 50% and a 24 px round badge in the suit ink with a check replaces the number on the right, with a one-time spreading ring (`onda`) and pop (`sigillo`) the first time only. **Progress tabs:** `n/3` on a row from 2 covered, `n/5` on a column from 3 covered; `notte-600` while open, gold with dark text when complete. Only tris and scopa are shown as progress. Jolly choice: eligible tiles get a 2 px gold ring, the picked one a white ring; the rest drop to 35% opacity. Winning cells are lit with a 4 px gold ring and gold glow. The jolly tile wears a "JOLLY" or "USATO" gold tag.

### Collection figures
Tiny SVG maps (4 columns x 6 rows of 7 px squares): filled places ivory (gold for combocard reale), empty ones dashed `testo-3`. Each has `role="img"` and an Italian label.

### Header
Sticky, `notte-800` at 95%, bottom hairline. Last-card miniature (enters with `estrai`), value in Bricolage over "di Seme", "N carte rimaste", a definition list of "Montepremi" and "I tuoi crediti" each with the **lentil token** (a gold oval on a dark outline, deliberately not a round coin), and a 44 px exit button. Credits count down or up with the `conta` pop.

### Action bar
Fixed bottom on phones, `notte-800` with top hairline and upward shadow. The creator sees the gold "Estrai Carta"; others see a bordered status "Estrae {name}". The jolly flow adds a gold banner above with two 44 px buttons ("Usa Jolly" dark, "Cambia carta"/"Annulla" outline).

### Dialogs
`.superficie` card, `max-w-md`, 24 px padding, on a `notte-950` 70% backdrop. Title in `.titolo`, 44 px close button, Esc and outside tap close, focus is trapped and returned.

### Inputs
`notte-950` fill, `linea-forte` border, 12 px radius, `testo` text, `testo-3` placeholder; focus is a 2 px gold ring; error switches the border to coral and shows a bold coral `role="alert"` message; hint in `testo-2`. Labels are bold 14 px.

### Toasts
Region always present, polite live. **Success** emerald, **error** coral (both with dark text), **warning** gold, **info** `notte-700` with hairline, **win** gold with the Bricolage voice, 18 px, first person, halo shadow. Tap dismisses; default 3 s. Enter with `estrai`.

### Draw reveal (RivelazioneCarta)
Fixed full-screen scene, `pointer-events: none`, `aria-hidden`. A `notte-950` 60% veil, then the card (46 vh, max 420 px) flips in (`rotateY`), holds, and flies up to the header while fading, in a halo of its suit ink. 1700 ms. Not shown for the card already drawn when the screen opened, and not shown at all under reduced motion.

### Confetti
28 rectangles in the five palette colours (four inks plus warm white) burst from 38% height; deterministic positions, 1400 ms, `pointer-events: none`, hidden under reduced motion.

### First-game guide and rules
The guide strip ("Come si gioca") is a `notte-700` panel with a 2 px hairline, three numbered lines, and a 44 px "Ho capito"; remembered per device. The full rules ("Come si gioca" section, `RegoleGioco`) are body text on the surface, headed by Bricolage subtitles, with the figure maps beside each collection.

### Motion
| Name | Duration | Use |
| --- | --- | --- |
| `rivela` / `velo` | 1700 ms | draw reveal card and veil |
| `sigillo` | 420 ms, cubic-bezier(0.22,1,0.36,1) | seal pop |
| `onda` | 700 ms ease-out | seal ring |
| `estrai` | 420 ms | header card, toasts |
| `conta` | 500 ms | credits change |
| `coriandolo` | 1400 ms | confetti |
| `--tinta` | 900 ms ease | table glow cross-fade |
| cooldown fill | 1000 ms linear | draw button |

**The Reduced Motion Rule.** Under `prefers-reduced-motion: reduce`, every animation and transition drops to 0.01 ms, the reveal scene is skipped in code, and confetti is hidden. State must still be readable without movement (seal, tab, and toast carry it).

### Accessibility
44 px minimum targets (52 px for the main action). The sheet is a table with a caption, column and row headers; every tile is a button named "{valore} di {seme}" with ", coperta" when covered. A 3 px gold focus ring with 2 px offset reads on both dark and ivory. Decoration (seal, reveal, confetti, credit token, icons) is `aria-hidden`. Toast region is a live region; errors are `role="alert"`. Dialogs are `aria-modal` with a focus trap.

## Do's and Don'ts

### Do:
- **Do** keep the table dark and let ivory cards be the only light objects.
- **Do** make the main action gold with `inchiostro` (#1a1208) text, and 44 px or taller.
- **Do** tint the table glow from the last drawn suit and nothing else.
- **Do** use `.titolo` (Bricolage 800) for titles and figures, the system sans for the rest.
- **Do** use solid `.superficie` panels: hairline, top-edge light, 20 px radius.
- **Do** give any new motion a reduced-motion fallback and keep scenes at `pointer-events: none`.
- **Do** mark decoration `aria-hidden` and name interactive tiles in Italian.

### Don't:
- **Don't** return to the retired look: straw paper, cream, orange, double rules, poster slabs.
- **Don't** use backdrop blur or frosted glass.
- **Don't** use emoji or glyph icons; use drawn icons and suit art.
- **Don't** use a suit ink as a status or brand colour, or draw credits as a round gold coin.
- **Don't** put white or ivory on non-card surfaces, and don't set text on gold in anything but `inchiostro`.
- **Don't** let the reveal or confetti capture a tap.

## Known limits and drift (not canonized)

- Tris and scopa are marked as progress tabs on their row and column; sequenza, napola and combocard reale are marked in the corner of the sheet (`SEQ`, `NAPOLA`, `REALE`, 11 px, gold when one card is missing), only while at most two cards are missing and nobody has won them. The corner keeps the height of the suit header: the labels never wrap.
- The sheet legend is 13 px and the progress tabs 11 px (the jolly tag 10 px): below comfortable reading size on a phone.
- Gold buttons rely on dark text for contrast; white text on gold would fail.
- The 1875 card art is vintage on purpose against the modern UI.
- The lobby code is set in Bricolage; whether `l` and `1` are distinguishable was not re-checked.
- The win moment (confetti, lit cells, win toast) has no screenshot, only tests.
- Drift in the build, recorded as defects and not as rules: outline and some secondary buttons use `hover:bg-white` with light text (unreadable on hover) and the danger button hovers to `oro-dark`; the first-game guide still says "con un fagiolo" although the covering is now a seal.
