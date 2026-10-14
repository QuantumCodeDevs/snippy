# Design — Snippy

A locked design system for this app. Every page redesign reads this file before
emitting code. Do not regenerate per page — extend or amend this file when the
system needs to grow.

## Genre

modern-minimal

## Macrostructure family

Pages share type, colour, radii, and button voice. They vary only by job.

- Marketing pages: Workbench. Title left, product figure right, one graphite band, one primary action.
- App pages: Workbench chrome without enrichment. Feeds, editor, settings, profile, and collections use the same surfaces.
- Content pages: Long Document. Privacy and terms are prose on the same paper. Auth is one panel.

## Theme

Cobalt, with a paired dark mode. One electric-blue accent. Clay and mint are not brand colours. Success and danger stay status colours.

Light (`[data-theme='light']`):

- `--color-paper`   oklch(98.5% 0.004 250)
- `--color-paper-2` oklch(96% 0.006 252)
- `--color-ink`     oklch(24% 0.02 258)
- `--color-ink-2`   oklch(42% 0.02 257)
- `--color-rule`    oklch(88% 0.01 252)
- `--color-accent`  oklch(52% 0.19 256)
- `--color-focus`   oklch(52% 0.19 256)

Dark (`:root`, the default when the OS is not light):

- `--color-paper`   oklch(20% 0.016 260)
- `--color-paper-2` oklch(25% 0.018 260)
- `--color-ink`     oklch(96% 0.008 250)
- `--color-ink-2`   oklch(78% 0.012 252)
- `--color-rule`    oklch(34% 0.02 258)
- `--color-accent`  oklch(74% 0.13 256)
- `--color-focus`   oklch(74% 0.13 256)

App token names in `snippy/frontend/src/styles/_tokens.scss` map onto these: `--page-bg` is paper, `--card-bg` / `--surface-hover` are paper-2, `--text-primary` is ink, `--text-muted` is ink-2, `--hairline` is rule, `--accent` is accent, `--focus-ring` is focus.

The graphite band (`--band-bg`) is the one dark beat on marketing pages. In dark mode it steps slightly darker than the page so the section still separates.

## Typography

- Display: Space Grotesk, weight 600, style normal
- Body:    Inter, weight 400
- Mono:    JetBrains Mono, weight 500
- Display tracking: -0.03em
- Type scale anchor: display headlines use `clamp(2.25rem, 4vw + 1rem, 4.25rem)`

Headings stay roman. Italic is for body emphasis only.

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

- Primary CTA: solid accent fill, 6px radius, near-white label in light mode and dark ink in dark mode. Copy names the action (Get started, Save).
- Secondary CTA: hairline border, same radius, ink label. Text links for quieter destinations.

## Per-page allowances

- Marketing pages MAY use the existing product screenshot inside a hairline figure. No drawn browser chrome.
- App pages MUST NOT use enrichment — function carries the page.
- Content pages: typography only.

## What pages MUST share

- The wordmark.
- The accent colour and its placement (primary button, active nav, focus, links).
- The display, body, and mono fonts.
- The CTA voice (6px controls, 10px panels).
- A hairline header, not a floating pill.

## What pages MAY differ on

- Whether the graphite band appears (marketing only).
- Header contents (landing, feed, editor, minimal). The editor keeps its save and layout controls.

## Exports

### tokens.css

```css
:root {
  --color-paper:      oklch(20% 0.016 260);
  --color-paper-2:    oklch(25% 0.018 260);
  --color-ink:        oklch(96% 0.008 250);
  --color-ink-2:      oklch(78% 0.012 252);
  --color-rule:       oklch(34% 0.02 258);
  --color-accent:     oklch(74% 0.13 256);
  --color-accent-ink: oklch(18% 0.02 260);
  --color-focus:      oklch(74% 0.13 256);

  --font-display: "Space Grotesk", sans-serif;
  --font-body:    "Inter", sans-serif;
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
  --color-paper:      oklch(98.5% 0.004 250);
  --color-paper-2:    oklch(96% 0.006 252);
  --color-ink:        oklch(24% 0.02 258);
  --color-ink-2:      oklch(42% 0.02 257);
  --color-rule:       oklch(88% 0.01 252);
  --color-accent:     oklch(52% 0.19 256);
  --color-accent-ink: oklch(98.5% 0.004 250);
  --color-focus:      oklch(52% 0.19 256);
}
```

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper:   oklch(98.5% 0.004 250);
  --color-ink:     oklch(24% 0.02 258);
  --color-accent:  oklch(52% 0.19 256);
  --font-display:  "Space Grotesk", sans-serif;
  --font-body:     "Inter", sans-serif;
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
    "paper":  { "$value": "oklch(98.5% 0.004 250)", "$type": "color" },
    "ink":    { "$value": "oklch(24% 0.02 258)", "$type": "color" },
    "accent": { "$value": "oklch(52% 0.19 256)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Space Grotesk", "$type": "fontFamily" },
    "body":    { "$value": "Inter", "$type": "fontFamily" }
  },
  "space": {
    "md": { "$value": "1.5rem", "$type": "dimension" }
  }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background:        20% 0.016 260;
  --foreground:        96% 0.008 250;
  --primary:           74% 0.13 256;
  --primary-foreground: 18% 0.02 260;
  --muted:             34% 0.02 258;
  --muted-foreground:  78% 0.012 252;
  --border:            34% 0.02 258;
  --input:             34% 0.02 258;
  --ring:              74% 0.13 256;
  --radius:            6px;
}

[data-theme="light"] {
  --background:         98.5% 0.004 250;
  --foreground:         24% 0.02 258;
  --primary:            52% 0.19 256;
  --primary-foreground: 98.5% 0.004 250;
  --muted:              88% 0.01 252;
  --muted-foreground:   42% 0.02 257;
  --border:             88% 0.01 252;
  --input:              88% 0.01 252;
  --ring:               52% 0.19 256;
}
```
