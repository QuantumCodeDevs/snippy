# Design — Snippy

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

## Genre

modern-minimal

## Macrostructure family

Pages share type, colour, radii, and button voice. They vary only by job.

- Marketing pages: Split Studio. Title and actions on the left, the product figure on the right, then a ruled manual of what a snippet actually includes, then one warm band and one primary action.
- App pages: the same chrome without the manual. Feeds, editor, settings, profile, and collections use the same surfaces.
- Content pages: Long Document. Privacy and terms are prose on the same paper. Auth is one panel.

## Theme

Orchard. The light palette is the five given swatches. Dark mode keeps the same hues and swaps the paper and the ink. Success and danger stay status colours.

Light (`[data-theme='light']`):

- `--color-paper`   oklch(96% 0.050 112) — `#F2F6D0`, the page
- `--color-paper-2` oklch(89.3% 0.025 153) — `#D0E1D4`, panels and dialogs
- `--color-sand`    oklch(86.2% 0.038 96) — `#D9D2B6`, hover
- `--color-ink`     oklch(32% 0.035 307) — deeper step of `#71697A`, so body text clears the sage panels
- `--color-ink-2`   oklch(45% 0.03 307) — muted text, same mauve
- `--color-rule`    oklch(60% 0.028 307) — mauve hairline. `#71697A` is the stronger rule and the off-state switch
- `--color-accent`  oklch(44% 0.085 62) — deeper step of `#E4BE9E`, so a pale-yellow label passes on the button
- `--color-focus`   oklch(44% 0.085 62)

`#E4BE9E` itself is the marketing band. It is too light to carry small text, so the band uses the deep mauve for its type.

Dark (`:root`, the default when the OS is not light):

- `--color-paper`   oklch(27% 0.025 307) — deep mauve
- `--color-paper-2` oklch(36% 0.03 150) — a dark sage lift
- `--color-ink`     oklch(96% 0.050 112) — `#F2F6D0`
- `--color-ink-2`   oklch(86.2% 0.038 96) — `#D9D2B6`
- `--color-rule`    oklch(55% 0.028 307)
- `--color-accent`  oklch(82.7% 0.061 62) — `#E4BE9E`, with mauve label text
- `--color-focus`   oklch(82.7% 0.061 62)

App token names in `snippy/frontend/src/styles/_tokens.scss` map onto these: `--page-bg` is paper, `--card-bg` is the sage panel, `--surface-hover` is sand, `--text-primary` is ink, `--text-muted` is ink-2, `--hairline` is rule, `--accent` is accent, `--focus-ring` is focus.

The band (`--band-bg`) is peach in light mode and a deeper mauve than the page in dark mode.

## Typography

- Display: Space Grotesk, weight 600, style normal
- Body:    IBM Plex Sans, weight 400
- Mono:    JetBrains Mono, weight 500
- Display tracking: -0.03em
- Type scale anchor: display headlines use `clamp(2.25rem, 4vw + 1rem, 4.25rem)`

Headings stay roman. Italic is for body emphasis only. Editor font preferences are unchanged.

## Spacing

4-point named scale. The values are in `_tokens.scss`. Pages must use named tokens (`var(--space-md)`), never raw values, for new layout spacing.

## Motion

- Easings: cubic-bezier(0.16, 1, 0.3, 1) named `--ease-out`
- Reveal pattern: none on the marketing page. Existing entry fades elsewhere use opacity and transform only, under 400ms.
- Reduced-motion fallback: opacity-only, animation removed.

## Microinteractions stance

- Silent success. Snackbars stay short status messages.
- Hover delay is not used on buttons. Focus rings appear instantly.
- Slide toggles have an opaque off track and a solid knob. The off state is never a hairline.

## CTA voice

- Primary CTA: solid peach fill, 6px radius, pale-yellow label in light mode and mauve ink in dark mode. Copy names the action (Get started, Save).
- Secondary CTA: hairline border, same radius, ink label. Text links for quieter destinations.

## Per-page allowances

- Marketing pages MAY use the existing product screenshot inside a hairline figure, plus a ruled manual of real product behaviour. No drawn browser chrome. No invented stats.
- App pages MUST NOT use enrichment — function carries the page.
- Content pages: typography only.

## What pages MUST share

- The wordmark.
- The peach accent and its placement (primary button, active nav, focus, links).
- The display, body, and mono fonts.
- The CTA voice (6px controls, 10px panels).
- A hairline header, not a floating pill.

## What pages MAY differ on

- Whether the warm band and the snippet manual appear (marketing only).
- Header contents (landing, feed, editor, minimal). The editor keeps its save and layout controls.

## Exports

### tokens.css

```css
:root {
  --color-paper:      oklch(27% 0.025 307);
  --color-paper-2:    oklch(36% 0.03 150);
  --color-ink:        oklch(96% 0.050 112);
  --color-ink-2:      oklch(86.2% 0.038 96);
  --color-rule:       oklch(55% 0.028 307);
  --color-accent:     oklch(82.7% 0.061 62);
  --color-accent-ink: oklch(27% 0.025 307);
  --color-focus:      oklch(82.7% 0.061 62);

  --font-display: "Space Grotesk", sans-serif;
  --font-body:    "IBM Plex Sans", sans-serif;
  --font-outlier: "JetBrains Mono", ui-monospace, monospace;

  --space-3xs: 0.25rem;  --space-2xs: 0.5rem;  --space-xs: 0.75rem;
  --space-sm:  1rem;     --space-md:  1.5rem;  --space-lg: 2rem;
  --space-xl:  3rem;     --space-2xl: 4.5rem;  --space-3xl: 7rem;

  --text-xs: 0.75rem;  --text-sm: 0.875rem; --text-md: 1.125rem;
  --text-lg: 1.375rem; --text-xl: 1.75rem;  --text-2xl: 2.25rem;

  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-short: 180ms;
  --radius-card: 10px; --radius-pill: 6px; --radius-input: 6px;
}

[data-theme="light"] {
  --color-paper:      oklch(96% 0.050 112);
  --color-paper-2:    oklch(89.3% 0.025 153);
  --color-ink:        oklch(32% 0.035 307);
  --color-ink-2:      oklch(45% 0.03 307);
  --color-rule:       oklch(60% 0.028 307);
  --color-accent:     oklch(44% 0.085 62);
  --color-accent-ink: oklch(96% 0.050 112);
  --color-focus:      oklch(44% 0.085 62);
}
```

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper:   oklch(96% 0.050 112);
  --color-ink:     oklch(32% 0.035 307);
  --color-accent:  oklch(44% 0.085 62);
  --font-display:  "Space Grotesk", sans-serif;
  --font-body:     "IBM Plex Sans", sans-serif;
  --spacing-md:    1.5rem;
  --text-md:       1.125rem;
  --ease-out:      cubic-bezier(0.16, 1, 0.3, 1);
}
```

Runtime colours in the app reference the CSS variables above so dark mode stays in sync. Do not hard-code a second palette in templates.

### DTCG `tokens.json`

```json
{
  "color": {
    "paper":  { "$value": "oklch(96% 0.050 112)", "$type": "color" },
    "ink":    { "$value": "oklch(32% 0.035 307)", "$type": "color" },
    "accent": { "$value": "oklch(44% 0.085 62)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Space Grotesk", "$type": "fontFamily" },
    "body":    { "$value": "IBM Plex Sans", "$type": "fontFamily" }
  },
  "space": {
    "md": { "$value": "1.5rem", "$type": "dimension" }
  }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background:        27% 0.025 307;
  --foreground:        96% 0.050 112;
  --primary:           82.7% 0.061 62;
  --primary-foreground: 27% 0.025 307;
  --muted:             55% 0.028 307;
  --muted-foreground:  86.2% 0.038 96;
  --border:            55% 0.028 307;
  --input:             55% 0.028 307;
  --ring:              82.7% 0.061 62;
  --radius:            6px;
}

[data-theme="light"] {
  --background:         96% 0.050 112;
  --foreground:         32% 0.035 307;
  --primary:            44% 0.085 62;
  --primary-foreground: 96% 0.050 112;
  --muted:              60% 0.028 307;
  --muted-foreground:   45% 0.03 307;
  --border:             60% 0.028 307;
  --input:              60% 0.028 307;
  --ring:               44% 0.085 62;
}
```
