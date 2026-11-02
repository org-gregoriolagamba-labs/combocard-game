---
name: ComboCard
description: A tombola sheet on a cobalt table. Italian multiplayer card game, phone-first, where every player reads a printed sheet of 40 places and watches beans cover the drawn cards.
colors:
  notte-950: "#0b1236"
  notte-900: "#101a4a"
  notte-800: "#16236a"
  notte-700: "#233792"
  notte-300: "#aeb9ee"
  cartone-50: "#fffaf0"
  cartone-100: "#f0dd9c"
  cartone-200: "#e4c96a"
  cartone-300: "#d3b04a"
  cartone-400: "#b8912c"
  inchiostro-900: "#2a1a0f"
  inchiostro-700: "#4d3522"
  inchiostro-500: "#7a5b3f"
  denari: "#8f6200"
  denari-soft: "#f5d98a"
  coppe: "#b92d1b"
  coppe-soft: "#f3b9ad"
  spade: "#1f3a99"
  spade-soft: "#b9c5f2"
  bastoni: "#236a3a"
  bastoni-soft: "#b5dcc0"
  fagiolo: "#b92d1b"
  fagiolo-dark: "#8f1f12"
  ocra: "#f2b632"
  ocra-dark: "#c98f0c"
typography:
  title:
    fontFamily: "Alfa Slab One, Rockwell, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 400
    letterSpacing: "0.01em"
  title-large:
    fontFamily: "Alfa Slab One, Rockwell, Georgia, serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.375
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
  body-small:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
  sheet-label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 700
  badge:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 700
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  foglio: "14px"
spacing:
  xs: "2px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  touch: "44px"
  action: "52px"
components:
  button-primary:
    backgroundColor: "{colors.fagiolo}"
    textColor: "#ffffff"
    rounded: "{rounded.xl}"
    padding: "8px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.fagiolo-dark}"
  button-secondary:
    backgroundColor: "{colors.ocra}"
    textColor: "{colors.inchiostro-900}"
    rounded: "{rounded.xl}"
    padding: "8px 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.ocra-dark}"
  button-outline:
    backgroundColor: "{colors.cartone-50}"
    textColor: "{colors.inchiostro-900}"
    rounded: "{rounded.xl}"
    padding: "8px 16px"
    height: "44px"
  button-disabled:
    backgroundColor: "{colors.inchiostro-500}"
    textColor: "{colors.cartone-50}"
  action-bar-button:
    backgroundColor: "{colors.fagiolo}"
    textColor: "#ffffff"
    rounded: "{rounded.xl}"
    height: "52px"
  input:
    backgroundColor: "{colors.cartone-50}"
    textColor: "{colors.inchiostro-900}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  sheet:
    backgroundColor: "{colors.cartone-100}"
    textColor: "{colors.inchiostro-900}"
    rounded: "{rounded.foglio}"
  sheet-cell:
    backgroundColor: "{colors.cartone-50}"
    rounded: "{rounded.md}"
    height: "44px"
  toast-win:
    backgroundColor: "{colors.ocra}"
    textColor: "{colors.inchiostro-900}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
---

# Design System: ComboCard

## Overview

**Creative North Star: "The Tombola Sheet"**

The screen is a cobalt-night table. On it lies a sheet of straw card stock printed in one brown ink with a thick outer rule and a fine inner rule. The player's sheet is a table: ten rows of values (Asso to Re) by four suit columns, 40 places. The player's 25 cards are printed in place; the other 15 stay empty with a dashed outline. A drawn card is covered by a vermilion bean. Collections read as shapes on the sheet: a tris is a row, a sequenza is neighbouring rows, a scopa is a column, a combocard reale is neighbouring rows in one column.

The voice is a printed poster: Alfa Slab One titles over system sans text, tabular figures, thick ink outlines, no emoji, no gradients. Each of the four suits has its own ink from the 1875 deck (cobalt, vermilion, ochre, green). Credits are play money drawn as a lentil, so they are never mistaken for the Denari suit.

Key Characteristics:
- Cobalt table (`#101a4a`), straw sheet (`#f0dd9c`), brown-black ink (`#2a1a0f`); no pure black or white surfaces besides ivory cells (`#fffaf0`).
- Every surface that holds content is a `.foglio` sheet or an ivory cell with an ink border.
- One action at a time, in the fixed bottom bar on a phone.
- Icons are single-stroke drawn SVGs (lucide line icons, the bean, the lentil, the suit marks); no emoji.

## Colors

A cobalt night, warm card stock and ink, and four suit inks. Vermilion is both the bean and the primary action; ochre is the secondary action and the win.

### Primary
- **Vermilion Bean** (`fagiolo` #b92d1b, dark #8f1f12): the bean on covered cards, the primary button, the draw action, "complete" badges (3/3, 5/5), progress segments. Bean outline stroke is `#7c1a0e` (drawn in the SVG only).

### Secondary
- **Ochre Action** (`ocra` #f2b632, dark #c98f0c): secondary buttons (Jolly), the Jolly confirmation panel, the win toast, the lentil credit fill, the focus ring on the table, highlighted and selectable cells.

### Tertiary: the four suit inks
- **Denari Ochre** (#8f6200, soft #f5d98a), **Coppe Vermilion** (#b92d1b, soft #f3b9ad), **Spade Cobalt** (#1f3a99, soft #b9c5f2), **Bastoni Green** (#236a3a, soft #b5dcc0). Used for the column headers (soft fill, ink text), the prizes and the collection strokes. Success toasts use Bastoni green; error uses Coppe.

### Neutral
- **Table**: Notte 950 #0b1236 (backdrop), 900 #101a4a (page ground), 800 #16236a (scrollbar track), 700 #233792 (info toast), 300 #aeb9ee (light text on the table).
- **Straw stock**: Cartone 50 #fffaf0 (ivory cells, inputs), 100 #f0dd9c (sheet, bars), 200 #e4c96a (row number discs, status pill), 300 #d3b04a, 400 #b8912c (dashed empty-place outline at 70%).
- **Ink**: Inchiostro 900 #2a1a0f (text, all outlines), 700 #4d3522 (secondary text, disabled draw button), 500 #7a5b3f (placeholders, disabled fill).

### Named Rules
**The One Ink Rule.** Text and outlines on straw are ink-brown, never black. Colour carries only suits, the bean and the action.
**The Bean Is Vermilion Rule.** Vermilion marks "covered" and "primary action" and nothing decorative.
**The Suit Ink Rule.** A suit colour appears only where a suit is named (header, prize, stroke). It never colours a generic state.

## Typography

**Display Font:** Alfa Slab One (with Rockwell, Georgia, serif), hosted in the project, class `.titolo`, `text-wrap: balance`.
**Body Font:** the system sans (system-ui, Segoe UI, Roboto, Arial), tabular figures set on `body`.

**Character:** a poster slab for names and numbers that matter, a quiet system sans for everything read in sentences.

### Hierarchy
- **Title** (400, 1.25rem): dialog titles, panel headings ("La tua cartella", "Collezioni", "Giocatori").
- **Title large** (400, 1.125rem, 1.375): the win toast; "Partita terminata".
- **Counter** (Alfa, 1rem): prize pool and credits in the header, with the lentil.
- **Body** (400, 1rem): page text and input text.
- **Body small** (700, 0.875rem): buttons in the Jolly panel, toast lines, field labels, collection descriptions.
- **Sheet label** (700, 13px): row names, suit names in column headers, and the sheet legend ("Posto vuoto: carta che non hai. Puntino: carta già uscita.").
- **Badge** (700, 11px): row (n/3) and column (n/5) progress tabs; the 10px "JOLLY"/"USATO" tag on a cell.

### Named Rules
**The Slab For Names Rule.** Alfa Slab One is for titles, the credits and the win line; running text never uses it.

## Layout

Phone-first (390x844 reference). A sticky header on top (last drawn card as a 52 px miniature with its name, "N carte rimaste", Montepremi and "I tuoi crediti" counters, the exit button). Below, the sheet at full width, then Collezioni, then Giocatori (a disclosure) and "Come si gioca". The one action sits in a fixed bottom bar (`bg #f0dd9c`, 4 px ink top border, 52 px button, content max 28rem) with the page padded 8rem at the bottom so nothing hides behind it. From the `lg` breakpoint (1024 px) the bar disappears: the sheet is sticky in a 26rem left column, the action moves into the sheet panel, collections and players fill the right column (max width 80rem, padding 1.5rem).

The sheet grid: a 4 column table with a 5.6rem row-label column, cells 44 px tall, 2 px border-spacing. Page padding 12 px, gaps 16 px. Spacing in use is Tailwind's 4 px steps (2, 6, 8, 12, 16, 24).

## Elevation & Depth

Depth is printed, not blurred: a card sheet lying on a table. Surfaces are flat with ink outlines; only the sheet and the fixed bars lift.

### Shadow Vocabulary
- **Foglio double rule** (`.foglio`: 3 px solid #2a1a0f border, 14 px radius, `box-shadow: inset 0 0 0 4px #f0dd9c, inset 0 0 0 5px #2a1a0f, 0 14px 28px -12px rgba(5,8,30,0.7)`): the thick outer rule, a straw gap, a fine inner rule, then a soft table shadow. Used for the sheet, panels and dialogs.
- **Pulsante** (`0 3px 0 rgba(42,26,15,0.9)`): defined, a hard ink edge for press buttons; the shipped Button uses `shadow-md`.
- **Bottom bar** (`0 -6px 16px rgba(5,8,30,0.45)`) and header (`shadow-lg`) over the scrolling content.
- **Win toast** reuses the foglio shadow token.

### Named Rules
**The Double Rule Rule.** Anything that is a sheet carries the thick-plus-fine ink rule; nothing else does.

## Shapes

Soft but inked: sheet 14 px, buttons/inputs/toasts 12 px (`rounded-xl`), Jolly buttons and the panel inner buttons 8 px, sheet cells and headers 6 px, tabs and badges 2 to 4 px, bean and lentil are organic ovals. Every control on straw has a 2 px ink border (3 px on the sheet). Empty places are dashed 2 px `cartone-400`. The drawn card miniature is a 3 px-radius 1 px ink-bordered image of the 1875 card.

## Components

### Buttons
- **Shape:** 12 px radius, min height 44 px, bold, `shadow-md`.
- **Primary:** vermilion `#b92d1b`, white text; hover `#8f1f12`. The draw action ("Estrai Carta") is a 52 px full-width version with a dice icon; during the cooldown it shows "Attendi Ns", a black 25% fill draining over 8 s, and a clock icon.
- **Secondary:** ochre `#f2b632` fill, ink text, 2 px ink border; hover `#c98f0c`. On the straw sheet it relies on its ink outline to separate from the stock (ochre against straw is low contrast by itself).
- **Outline:** ivory `#fffaf0` fill, 2 px ink border; hover white.
- **Danger:** Coppe red, white text.
- **Disabled:** `#7a5b3f` fill, `#fffaf0` text, no border. A disabled Jolly is a dashed outline.
- **Focus:** see Accessibility below.

### Inputs / Fields
Ivory fill, 2 px ink border, 12 px radius, 16x12 padding, ink-500 placeholder. Label above (14 px bold), required star in Coppe. Focus: 2 px Spade ring. Error: Coppe border and a bold 14 px message with `role="alert"`; hints are 12 px ink-700.

### Dialogs
A `.foglio` panel (max 28rem, 24 px padding, max height 90dvh) over a `#0b1236` 70% backdrop. Alfa title, a 44x44 "Chiudi" button with a × glyph. Role dialog, modal, labelled by the title; focus moves in and is trapped, Esc or a tap outside closes, focus returns to the opener.

### Toasts
A polite live region (`Notifiche`) over the action bar (bottom 10rem on a phone, bottom right on desktop), max 20rem, 12 px radius, entering with the "estrai" animation, tap to dismiss, 3 s default.
- **success** Bastoni green, white text (another player's win: "<name> ha vinto SCOPA: 40 crediti", 4 s).
- **error** Coppe red, white text, `role="alert"`.
- **warning** ochre, ink text, ink border.
- **info** Notte 700, white text.
- **win** (first person): ochre, Alfa Slab 18 px, ink border, foglio shadow, 6 s: "Hai vinto SCOPA: +40 crediti" or "Hai vinto … insieme ad altri: +N crediti". The only notice that is not a log line.

### The Sheet (signature component)
A `<table>` with a screen-reader caption, column headers and row headers (`scope`). Header row: the four suits, each in its soft suit fill with an ink border, suit mark (24 px) and the suit name in suit ink (13 px). Row headers: an Alfa number disc (1 to 10, `#e4c96a`, ink border) and the value name. Cells: an ivory 44 px button with a 32 px suit mark, named "Re di Bastoni" or "..., coperta". Places not in the player's sheet are dashed empties; a place whose card has been drawn but which the player lacks shows a small dot. The legend beneath explains both.
- **Beans:** a 30x22 vermilion SVG bean at the bottom right of a covered cell, tilted from a fixed set (-12, 6, -3, 12, 3 degrees). It drops in with the "fagiolo-giu" animation only when newly covered; beans present on first render do not fall.
- **Progress tabs:** a row shows "n/3" from 2 covered (ink tab, vermilion at 3); a column shows "n/5" at its top right from 3 covered (ink, vermilion at 5). These are the only progress marks on the sheet: tris and scopa. Sequenza and combocard reale progress is shown only in the collection list, not on the sheet.
- **Jolly selection:** selectable cells get an ochre ring; a selected one a 4 px ink ring and scale 1.10; others fade to 40%. A destination place turns ochre with a sparkle icon; a "JOLLY"/"USATO" tag sits at the cell's top left.

### Collection figures
Each collection (Sequenza, Scopa, Napola, Combocard Reale) is a list row: a small dotted grid figure showing its shape on the 4x10 sheet (ink squares; vermilion squares for the combocard reale), the name in bold caps with "Premio N" in the suit ink weight, a one-line rule in Italian, a progress bar of vermilion segments with "3/4 · ne manca 1", the winner line in green ("Vinta da Anna"), and a Jolly action (ochre, or dashed when unavailable).

### Credits and the last card
The lentil (`Credito`): a tilted ochre oval with an ink outline and a seam stroke, 16 px by default. It sits next to Montepremi and I tuoi crediti. The counter pops (`conta`) when the value changes. The last card is a 52 px miniature of the 1875 card with a "Re / di Bastoni" caption.

## Motion

All motion eases with `cubic-bezier(0.22, 1, 0.36, 1)`.
- **Bean drop** `fagiolo-giu` 380 ms: from 10 px above, scale 1.25, to rest.
- **Last-card entrance** `estrai` 420 ms: from 12 px above and -6 degrees; also used by toasts.
- **Counter pop** `conta` 500 ms: scale 1.35 to 1.
- Cell transitions and the cooldown fill use `transition`, with `motion-reduce:transition-none` on cells.
- `prefers-reduced-motion: reduce` forces every animation and transition to 0.01 ms, one iteration, auto scroll.

## Accessibility

- Touch targets: every interactive control is at least 44 px (sheet cells 44 px tall, buttons 44 px, the action bar button 52 px, dialog close 44x44).
- Table semantics on the sheet (caption, `th scope="col"` and `scope="row"`), each card named "Valore di Seme[, coperta]"; progress tabs are `aria-hidden` and the same state is in the collection list.
- Focus ring: 3 px solid ochre `#f2b632`, offset 2 px, with a 5 px `#101a4a` halo, on the table. Inside a `.foglio` it becomes 3 px Spade `#1f3a99` with a 5 px `#f0dd9c` halo.
- Live regions: toast region is polite, errors are alerts; Jolly prompts are polite. Esc steps back out of Jolly mode and dialogs.
- Selection highlight is ochre with ink text; checkbox accent is vermilion.

### Known limits
- Only tris (rows) and scopa (columns) are marked on the sheet as progress; sequenza and combocard reale are not.
- The sheet legend and row/suit labels are 13 px, the progress tabs 11 px and the Jolly tag 10 px: small for a phone.
- The lobby code is set in Alfa Slab One, where a lowercase "l" and the digit "1" can be confused.
- The ochre actions (secondary buttons, Jolly) rely on their ink outlines to separate from the straw sheet; ochre against straw alone is low contrast.
- The `pulsante` shadow token is defined but the shipped buttons use `shadow-md`.

## Do's and Don'ts

### Do:
- **Do** keep the cobalt table (`#101a4a`) as the page ground and put content on `.foglio` sheets or ivory cells.
- **Do** outline every control on straw with 2 px `#2a1a0f`.
- **Do** keep the sheet shape: values in rows Asso to Re, suits in columns, 44 px minimum cells.
- **Do** cover a drawn card with the vermilion bean, and drop it only when it is new.
- **Do** announce a player's own win in the first person ("Hai vinto ...") with the ochre `win` toast and the pop on the credit counter.
- **Do** write UI strings in Italian and use single-stroke drawn icons (bean, lentil, suit marks, line icons).
- **Do** guard every animation with `prefers-reduced-motion`.

### Don't:
- **Don't** use emoji or a round coin for credits; the credit is the lentil, and it is never the Denari suit.
- **Don't** use a cream panel with an orange border, or pure black and white surfaces.
- **Don't** use a suit colour for a generic state, or vermilion for decoration.
- **Don't** set running text in Alfa Slab One.
- **Don't** put an action in a place other than the fixed bottom bar (phone) or the sheet panel (desktop).
- **Don't** hide a state in colour alone; pair it with text ("n/5", "Attendi 8s", "coperta").
