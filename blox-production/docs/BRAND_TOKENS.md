# Blox brand tokens

**System of record:** `Blox_Branding.pdf` v1.0 (teal stack)  
**Implemented:** 2026-07-24

## Core palette

| Token | Hex | Role |
|-------|-----|------|
| Deep Green | `#16535B` | Foundation, primary text, contrast on lime |
| Emerald | `#00CFA2` | Secondary accent, success / paid |
| Lime | `#DBFF00` | CTA / hero accent |
| White | `#FFFFFF` | Surfaces / cards |
| Slate | `#708090` | Secondary text / borders (PDF mislabeled “WHITE”) |

Derived: lime dark `#C4E600`, lime light `#E8FF66`, slate dark `#4A5560`, slate light `#A8B2BC`, page bg `#F0F5F5`, chrome dark `#0F3A40`, emerald wash `#E6FBF5`.

## Design system — Direction A (Restrained Luxury)

Premium comes from **restraint + hierarchy**, not more color. Anchor on deep green,
work in emerald, spend lime rarely.

### Color roles

| Role | Color | Where |
|------|-------|-------|
| Foundation / structure | Deep Green `#16535B`, chrome dark `#0F3A40` | Nav, hero panels, headers, key dark surfaces |
| Surface | White `#FFFFFF` on canvas `#F0F5F5` | All content cards, forms, tables |
| Interactive / wealth | Emerald `#00CFA2` | Links, secondary buttons, active states, paid/positive, icons, progress, focus halo |
| CTA (precious) | Lime `#DBFF00` + deep-green text | ONE hero action and/or ONE headline number per view |
| Neutral | Slate `#708090` / dark `#4A5560` / light `#A8B2BC` | Secondary text, hairline borders, disabled |
| Danger | `#C62828` | Destructive/error only (outside the brand 5) |

### Lime vs Emerald (the core rule)

- **Emerald** = the color you interact with all day.
- **Lime** = the color you *notice*. If two limes fight on one screen, one is wrong.

### Atmosphere

- One dark deep-green moment per view (hero or nav). Everything else calm white on the misted canvas.
- No gradients on ordinary cards. No radial washes behind content.

### Depth, border, radius

- Radius: **12** controls · **18** cards · **28** hero.
- Borders: hairline `rgba(22, 83, 91, 0.08)` — never hard grey lines.
- Shadows: teal-tinted, **2 levels only** — resting (`--card-shadow`) + lifted (`--card-shadow-hover`). No pure-black shadows.

### Density & type

- 8pt spacing; 24–32 gutters on money screens.
- Scale with real jumps: 32 / 24 / 16 / 14 / 12; tight tracking on headings.
- Every monetary value: Space Grotesk, tabular, sized with intent (`.blox-money` / `.blox-numeric`).

### Motion (max 3)

1. Surface lift on hover — `translateY(-2px)` + shadow step.
2. Emerald→lime accent reveal on the active/primary element only.
3. Content fade-in — 150–220ms, one easing curve `cubic-bezier(0.22, 1, 0.36, 1)`.

## Engineer design contract (do / don't)

**Do**
- Use `--primary-btn-*` (lime) for the single hero action on a screen.
- Use emerald (`--secondary-color`) for everyday buttons, links, active nav, positive states.
- Anchor page chrome/hero in deep green (`--blox-deep-green` / `--blox-deep-green-dark`).
- Wrap money/rates/QID/tenure in `.blox-money` or `.blox-numeric` (Space Grotesk, tabular).
- Use `--card-shadow` / `--card-shadow-hover` and hairline `--card-border`.
- Keep radii on the 12/18/28 scale.

**Don't**
- Don't set lime as a component's default/primary interactive color.
- Don't place two lime elements competing on one screen.
- Don't use pure-black (`#000`) shadows or hard grey borders.
- Don't add gradients/washes to routine content cards.
- Don't introduce new hues, purple/cream, or Inter/Roboto/Poppins.
- Don't put white text on lime — always deep green on lime.

## Logo assets (regenerated)

Transparent PNG/SVG marks synced to the teal stack:

| Asset | Use |
|-------|-----|
| `BloxLogo.png` | Dark mark — auth/login cards, loading, light nav chrome |
| `BloxLogoNav.png` | Light mark — SidePanel (deep-green chrome), customer login dark banner |
| `BloxMark.svg` | Favicon / compact mark |

## Source files

| Surface | File |
|---------|------|
| Web tokens | `packages/shared/src/config/brand-tokens.ts` |
| MUI + `brandColors` | `packages/shared/src/config/theme.ts` |
| CSS variables | `packages/shared/src/styles/global.scss` |
| Flutter colors | `blox-app/lib/core/theme/blox_colors.dart`, `lib/ui/tokens/blox_color_tokens.dart` |
| Flutter numeric type | `BloxTextStyles.numeric()` → Space Grotesk |
| Web numeric type | `.blox-numeric` / `[data-blox-numeric]` → Space Grotesk |

## Typography

- **UI text:** IBM Plex Sans (300–700)
- **Numbers / money / tenure / QID:** Space Grotesk

## CTA contrast

Lime buttons use **deep green** text (`#16535B` on `#DBFF00`), not white. Focus rings pair deep green stroke + lime halo.

## Tagline

**Finance Unboxed** on auth / marketing heroes only (admin, dealer, credit, super-admin, customer login banner, Flutter login hero). Not in ops tables.

## Intentional exceptions / follow-ups

1. **Status semantic reds** (`#C62828`) remain for destructive/error — not in the 5-swatch PDF set.
2. **Chart libraries** may still need per-series colors; prefer emerald / lime / deep green / slate.
3. **Apply `BloxTextStyles.numeric()` / `.blox-numeric`** on remaining money widgets incrementally where not yet wired.
4. **Logo clearspace** geometry lives in the PDF artwork; regenerated assets above replace prior marks.
5. Email body chrome uses emerald bars; primary CTAs use lime + deep green text.
6. Historical design-spec markdown under `docs/` / repo root may still mention the old lime-on-black palette — product code is the source of truth.

## Visual checklist

- [ ] Admin login + applications list + detail + one money/payment view  
- [ ] Customer login + vehicles + application detail + payment  
- [ ] Dealer login + applications queue + detail  
- [ ] Credit login + queue + detail  
- [ ] Super-admin login  
- [ ] Flutter: home, vehicles, application detail  
- [ ] Contract PDF + one transactional email preview  
