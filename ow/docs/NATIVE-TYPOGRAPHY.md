# Native OW typography design system — PR #43

Source of truth: the original React/Electron `SkillCard.jsx`, the user-provided
Electron comparison screenshots, and physical Windows feedback on v1.13.10.
This PR is *typography only*: no carousel, theme, input or gameplay changes.

## 1280 × 720 reference scale

Font: original licensed VT323, built as an offline 22 × 40 px per-glyph atlas.
Because native clip-space Y spans 720px over 2 NDC units, one unit of glyph
height represents 360 physical pixels. Text is fitted to its actual cell
aspect ratio (**22 ÷ 40 × 360 ÷ 640 = 0.309375 NDC X per NDC Y**).

| Role | Hero/center (px) | Near card (px) | Outer card (px) |
|---|---:|---:|---:|
| Category, small uppercase | 13 | 12 | 10 |
| Title, mixed case | 24 | 19 | 15 |
| Level badge | 18 | 17 | 14 |
| Mob name | 22 | 19 | 16 |
| Action button | 28 | 22 | 18 |
| HP counter | 13 | only center | only center |
| Description | 17 | only center | only center |

Global hero headline: 56px. Drawer title: 41px. Drawer subtitle: 24px.
Drawer status: 21px. Drawer option: 26px.
Wrapped two-line title: 15px focus, 13px near, 12px outer.

## Kerning, colors and geometry

No artificial tracking or horizontal stretching. Width depends on the
original 22:40 glyph aspect, not the number of characters in a destination
rectangle. Natural advance uses **0.80–0.83 × glyph quad width** to account
for transparent side bearings already baked into VT323; the hero title uses
1.02 × for emphasis. Short words never expand to fill a button or pill.
A line that truly does not fit is uniformly scaled in both X and Y, keeping
the physical font aspect correct.

Ink-envelope fitting is strict: last visible right edge <= available width
minus 0.007 NDC (~4.5 pixels at 1280). All title rows reserve the level badge
column; there is no card-wide text clipping or accidental overlapping.

- Main title/badge: #F5F7FF, legible and softly outlined.
- Category/HP/description: muted cool white for visual hierarchy.
- Action labels: warm bright white on the original colored activity CTA.
- Gold hero title: retained. Outer card text remains progressively dimmed.
- 1px dark atlas-sampled outline prevents text from disappearing over a
  colored gradient or mob artwork, without requiring browser/CSS.

## Regression requirements

1. OWUnit typography role sizes, fit envelope and aspect invariance;
   near/far scale monotonicity; all six title strings and badges.
2. OWUnit menu text shade-band and color-role encoding.
3. Mesa GL: compile and render the role-aware shader with original atlas,
   cycle all six cards with animations, verify GPU resource cleanup.
4. No JavaScript/Electron/browser/font files required during native startup.
5. Portable Windows x64, Linux x64, macOS ARM64 build matrix green.
6. **Physical Windows screenshot comparison against the original Electron
   UI is still mandatory**; neither unit tests nor CI certify 1:1 parity.
