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

Retro-modern. Warm cream in light mode, a lifted warm charcoal in dark mode, and one copper accent. Cobalt, clay, and mint are not brand colours. Success and danger stay status colours.

Light (`[data-theme='light']`):

- `--color-paper`   oklch(97% 0.014 88)
- `--color-paper-2` oklch(94.2% 0.02 82)
- `--color-ink`     oklch(26% 0.03 55)
- `--color-ink-2`   oklch(42% 0.03 58)
- `--color-rule`    oklch(86% 0.02 78)
- `--color-accent`  oklch(50% 0.13 42)
- `--color-focus`   oklch(50% 0.13 42)

Dark (`:root`, the default when the OS is not light). Paper is lifted from the previous near-black so the theme stays dark without reading as a void:

- `--color-paper`   oklch(29% 0.022 62)
- `--color-paper-2` oklch(36% 0.026 66)
- `--color-ink`     oklch(96% 0.012 85)
- `--color-ink-2`   oklch(80% 0.018 75)
- `--color-rule`    oklch(46% 0.028 66)
- `--color-accent`  oklch(80% 0.12 68)
- `--color-focus`   oklch(80% 0.12 68)

App token names in `snippy/frontend/src/styles/_tokens.scss` map onto these: `--page-bg` is paper, `--card-bg` / `--surface-hover` are paper-2, `--text-primary` is ink, `--text-muted` is ink-2, `--hairline` is rule, `--accent` is accent, `--focus-ring` is focus.

The warm band (`--band-bg`) is the one dark beat on marketing pages. In dark mode it steps slightly darker than the page so the section still separates.

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

- Primary CTA: solid copper fill, 6px radius, cream label in light mode and dark ink in dark mode. Copy names the action (Get started, Save).
- Secondary CTA: hairline border, same radius, ink label. Text links for quieter destinations.

## Per-page allowances

- Marketing pages MAY use the existing product screenshot inside a hairline figure, plus a ruled manual of real product behaviour. No drawn browser chrome. No invented stats.
- App pages MUST NOT use enrichment — function carries the page.
- Content pages: typography only.

## What pages MUST share

- The wordmark.
- The copper accent and its placement (primary button, active nav, focus, links).
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
  --color-paper:      oklch(29% 0.022 62);
  --color-paper-2:    oklch(36% 0.026 66);
  --color-ink:        oklch(96% 0.012 85);
  --color-ink-2:      oklch(80% 0.018 75);
  --color-rule:       oklch(46% 0.028 66);
  --color-accent:     oklch(80% 0.12 68);
  --color-accent-ink: oklch(24% 0.03 55);
  --color-focus:      oklch(80% 0.12 68);

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
  --color-paper:      oklch(97% 0.014 88);
  --color-paper-2:    oklch(94.2% 0.02 82);
  --color-ink:        oklch(26% 0.03 55);
  --color-ink-2:      oklch(42% 0.03 58);
  --color-rule:       oklch(86% 0.02 78);
  --color-accent:     oklch(50% 0.13 42);
  --color-accent-ink: oklch(98% 0.01 90);
  --color-focus:      oklch(50% 0.13 42);
}
```

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper:   oklch(97% 0.014 88);
  --color-ink:     oklch(26% 0.03 55);
  --color-accent:  oklch(50% 0.13 42);
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
    "paper":  { "$value": "oklch(97% 0.014 88)", "$type": "color" },
    "ink":    { "$value": "oklch(26% 0.03 55)", "$type": "color" },
    "accent": { "$value": "oklch(50% 0.13 42)", "$type": "color" }
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
  --background:        29% 0.022 62;
  --foreground:        96% 0.012 85;
  --primary:           80% 0.12 68;
  --primary-foreground: 24% 0.03 55;
  --muted:             46% 0.028 66;
  --muted-foreground:  80% 0.018 75;
  --border:            46% 0.028 66;
  --input:             46% 0.028 66;
  --ring:              80% 0.12 68;
  --radius:            6px;
}

[data-theme="light"] {
  --background:         97% 0.014 88;
  --foreground:         26% 0.03 55;
  --primary:            50% 0.13 42;
  --primary-foreground: 98% 0.01 90;
  --muted:              86% 0.02 78;
  --muted-foreground:   42% 0.03 58;
  --border:             86% 0.02 78;
  --input:              86% 0.02 78;
  --ring:               50% 0.13 42;
}
```
