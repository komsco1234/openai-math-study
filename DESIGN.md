# OpenAI Math Study Design System

## 0. Research Log

- Embedded refs: shortlisted Notion, Claude, and Mintlify; picked `minimalist-skill.md` + `notion.md` for document-first reading, warm neutrals, and whisper borders.
- Lazyweb: 2 desktop queries, 2 screens viewed; kept Clever's search-first library structure and EdSurge's list-plus-topic-rail grammar.
- Imagen drafts: `exec-f8ba8619-fba3-4b96-a98e-937a42eba1fb.png` contains Editorial Library and Scholarly Index directions; picked Editorial Library as reference contract.
- UI/UX DB: academic study query suggested scholarly serif + hyperlegible sans; retained the pairing idea but rejected its generic purple study palette in favor of one restrained blue accent.
- Interaction reference: beui `bouncy-accordion` informed disclosure semantics; implementation uses native `details` for keyboard and reduced-motion reliability.
- Redesign direction: user requested a mathematical hard-problem concept; retained the working catalogue shell and replaced the warm workspace language with a dark theorem vault, proof-grid texture, gold theorem markers, and Cambria manuscript typography.

## 1. Atmosphere & Identity

A theorem vault for unresolved and newly solved mathematics: obsidian-blue surfaces, drafting-grid structure, dense proof text, and restrained gold markers. Signature: the therefore mark `∴` and gold theorem rule identify the active result while the surrounding interface stays cold, exact, and archival.

Design dials: variance 5, motion 3, density 5.

## 2. Color

| Role | Token | Value | Usage |
| --- | --- | --- | --- |
| Canvas | `--surface-canvas` | `#070b12` | Page background |
| Primary surface | `--surface-primary` | `#0e1521` | Header, panels |
| Secondary surface | `--surface-secondary` | `#121c2b` | Filters, alternate rows |
| Selected surface | `--surface-selected` | `#17253a` | Active family |
| Text primary | `--text-primary` | `#f4f0e7` | Headings and body |
| Text secondary | `--text-secondary` | `#c5c0b7` | Descriptions |
| Text muted | `--text-muted` | `#9f9a91` | Metadata; AA contrast at small sizes |
| Border | `--border-default` | `#2f4058` | Structural grid and dividers |
| Border strong | `--border-strong` | `#526984` | Controls |
| Accent | `--accent-primary` | `#e0b454` | Theorem selection and links |
| Accent hover | `--accent-hover` | `#f0ca72` | Hover/pressed |
| Accent soft | `--accent-soft` | `#2b2618` | Theorem badges |
| Success | `--status-success` | `#9bd6aa` | Lean/formalization status |
| Success soft | `--status-success-soft` | `#14271b` | Status badge surface |
| Warning | `--status-warning` | `#e0b454` | Data caveats |
| Warning soft | `--status-warning-soft` | `#2b2618` | Caveat surface |
| Focus | `--focus-ring` | `#8bc7ff` | Keyboard focus |
| Scrim | `--surface-scrim` | `rgba(3, 7, 18, 0.78)` | Mobile detail backdrop |
| Grid line | `--grid-line` | `rgba(82, 105, 132, 0.12)` | Mathematical drafting grid |

Rules:

- Gold is the only saturated interaction color.
- Green communicates verified Lean support and always includes text.
- Surface hierarchy uses tonal shifts and whisper borders, not decorative gradients.

## 3. Typography

| Level | Token | Size / line height | Weight | Usage |
| --- | --- | --- | --- | --- |
| Display | `--type-display` | `clamp(2rem, 4vw, 3.5rem) / 1.05` | 700 | Page title |
| H1 | `--type-h1` | `2rem / 1.15` | 700 | Detail title |
| H2 | `--type-h2` | `1.375rem / 1.3` | 700 | Section title |
| H3 | `--type-h3` | `1.125rem / 1.35` | 650 | Family title |
| Body large | `--type-body-lg` | `1.125rem / 1.6` | 400 | Intro |
| Body | `--type-body` | `1rem / 1.6` | 400 | Reading text |
| Body small | `--type-body-sm` | `0.875rem / 1.5` | 400 | Metadata |
| Caption | `--type-caption` | `0.75rem / 1.4` | 600 | Labels |

- UI font: Aptos, `Segoe UI`, `Helvetica Neue`, Arial, sans-serif.
- Manuscript font: `Cambria Math`, Cambria, Georgia, serif. Serif is justified only for theorems, manuscript titles, and quotations.
- Metadata and result IDs use `Cascadia Mono`, `SFMono-Regular`, Consolas, monospace with tabular numerals.

## 4. Spacing & Layout

Base unit: 4px.

| Token | Value |
| --- | --- |
| `--space-1` | `0.25rem` |
| `--space-2` | `0.5rem` |
| `--space-3` | `0.75rem` |
| `--space-4` | `1rem` |
| `--space-5` | `1.25rem` |
| `--space-6` | `1.5rem` |
| `--space-8` | `2rem` |
| `--space-10` | `2.5rem` |
| `--space-12` | `3rem` |
| `--space-16` | `4rem` |

- Max width: 1440px.
- Desktop: 264px topic rail, fluid catalogue, 400px detail panel.
- Tablet: filters collapse above catalogue; detail becomes overlay panel.
- Mobile: one readable column; selected detail replaces the list with explicit back control.
- Breakpoints: 640px, 900px, 1200px.

## 5. Components

### Search Field

- Structure: visible label, search input, clear button.
- States: empty, populated, focused, disabled, no-results.
- Accessibility: native search input, keyboard shortcut hint is supplementary.
- Motion: color and outline only, 150ms.

### Filter Control

- Structure: native select or checkbox with label.
- States: default, hover, checked, focus, disabled.
- Accessibility: minimum 44px target and native semantics.

### Result Family Row

- Structure: numbered heading, subject metadata, description, status labels.
- States: default, hover, selected, focus.
- Accessibility: semantic button; full title in accessible name.
- Motion: selected rule and surface color, 150ms; no layout movement.

### Status Badge

- Variants: Lean formalized, reasoning summary, manuscript count.
- States: static; linked variants receive hover/focus.
- Accessibility: status is text, never color alone.

### Detail Panel

- Structure: family title, description, actions, manuscript disclosures.
- States: empty prompt, selected, loading, error.
- Accessibility: labelled region; mobile close/back control; focus moves to heading after selection.
- Overlay behavior: background becomes inert, Tab stays inside the panel, Escape closes it, and focus returns to the selected row.
- Motion: tablet/mobile entry uses opacity and translate only; disabled under reduced motion.

### Manuscript Disclosure

- Structure: native `details`/`summary`, abstract, PDF link.
- States: closed, open, focus.
- Accessibility: native disclosure semantics and keyboard behavior.
- Motion: none; native state is preferred over height animation.

### Progress Control

- Structure: checkbox labelled "Studied" and saved counter.
- States: unchecked, checked, focus.
- Storage: browser-local only.
- Accessibility: native checkbox; confirmation is visible text in the progress summary.

### Primitive Showcase

- `showcase.html` exercises controls, family rows, badges, disclosures, empty and error messages at responsive widths before screen composition.

## 6. Motion & Interaction

| Token | Value | Usage |
| --- | --- | --- |
| `--motion-micro` | `150ms ease-out` | Hover, press, focus |
| `--motion-standard` | `240ms cubic-bezier(0.16, 1, 0.3, 1)` | Detail panel |

- Motion only signals selection, focus, or panel context.
- `prefers-reduced-motion: reduce` removes transform transitions.
- No scroll listeners. Search filters the bounded local catalogue directly on input.

## 7. Depth & Surface

Strategy: theorem-grid borders plus cold tonal shift.

- Default separation: `1px solid var(--border-default)`.
- Selected content: `var(--surface-selected)` plus a 3px gold theorem rule.
- One shadow token is allowed only on tablet/mobile overlays: `0 24px 70px rgba(0, 0, 0, 0.48)`.

## 8. Accessibility Constraints & Accepted Debt

Constraints:

- WCAG 2.2 AA target.
- Body contrast at least 4.5:1; controls and focus at least 3:1.
- All tasks keyboard reachable; no hover-only information.
- Touch targets at least 44px.
- Zoom and text reflow supported to 200%.
- Reduced motion respected.

Accepted debt:

| Item | Location | Why accepted | Exit |
| --- | --- | --- | --- |
| Mathematical TeX remains plain source text | Catalogue descriptions | Full MathJax would add third-party runtime and weaken offline/performance goals | Add local KaTeX build only if typeset formulas become a core requirement |

