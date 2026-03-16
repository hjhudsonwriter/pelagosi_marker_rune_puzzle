
# Pelagosi Marker Rune Puzzle

A standalone GitHub Pages minigame for your Pelagosi rune puzzle.

## What is included

This repo is ready to upload directly to GitHub Pages and run as a single-page puzzle experience.

### Features
- Large central Marker image with overlaid rune spiral
- Pelagosi-styled blue arcane UI
- Begin button and rules modal
- Two-stage puzzle logic:
  1. Restore the missing rune in the spiral
  2. Press the awakened runes in the correct remembered order
- Drag-and-drop **and** click-to-place support for Stage I
- Success and failure states
- Opening-cavern final animation
- Placeholder rune artwork and sound effects already included

## Repository structure

```text
pelagosi-marker-rune-puzzle/
├── index.html
├── styles.css
├── app.js
└── assets/
    ├── images/
    │   └── marker-main.png
    ├── runes/
    │   ├── rune-anchor.svg
    │   ├── rune-tide.svg
    │   ├── rune-depth.svg
    │   └── socket-triangle.svg
    └── audio/
        ├── rune-place.wav
        ├── rune-click.wav
        ├── puzzle-fail.wav
        ├── puzzle-solve.wav
        └── cavern-open.wav
```

## Custom asset filenames to keep

If you want the page to work without changing code, keep these exact filenames:

### Main marker image
- `assets/images/marker-main.png`

### Rune images
- `assets/runes/rune-anchor.svg`
- `assets/runes/rune-tide.svg`
- `assets/runes/rune-depth.svg`

### Sound effects
- `assets/audio/rune-place.wav`
- `assets/audio/rune-click.wav`
- `assets/audio/puzzle-fail.wav`
- `assets/audio/puzzle-solve.wav`
- `assets/audio/cavern-open.wav`

## Puzzle logic in this build

### Stage I
Players inspect the spiral and place the missing rune into the broken socket.

Observed pattern:

```text
⚓  ☾  ≈
☾  ≈  ⚓
≈  ⚓  ?
```

Correct missing rune:
- `☾ Tide`

### Stage II
Once the missing rune is restored, three glowing runes appear at the base.

Correct activation order:
1. `Tide`
2. `Depth`
3. `Anchor`

If players enter the wrong activation order:
- the sea surges
- the trial resets to Stage I

## Deploying to GitHub Pages

1. Create a new GitHub repository.
2. Upload all files from this folder to the repository root.
3. Commit and push.
4. In GitHub, go to **Settings → Pages**.
5. Under **Build and deployment**, set:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main`
   - **Folder**: `/ (root)`
6. Save.
7. GitHub Pages will publish the site.

## Notes for future swaps

- Replace the placeholder marker art with your real obelisk image using the same filename.
- Replace the placeholder rune SVGs with your custom rune art later using the same filenames.
- Replace the placeholder WAV files with your own sound design later using the same filenames.
- No code edits are required if you keep the file names the same.

## Optional edits you may want later
- Swap the font stack for a more custom Pelagosi look
- Add a narrated voiceover intro
- Replace the final seam effect with a custom cavern-opening image or video
- Add a DM-only hidden hotkey to auto-solve during testing
