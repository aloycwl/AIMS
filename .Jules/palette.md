## 2024-05-23 - [Professionalizing "Tech" Aesthetics]
**Learning:** A "neon" or "tech" theme can quickly look dated if overdone. Using high-end typography (Inter), subtle glassmorphism (lower opacity + higher blur), and entrance animations (section reveal) creates a "premium SaaS" feel rather than a "gaming" look.
**Action:** Balance glow effects with plenty of negative space and crisp typography to maintain a professional brand identity.

## 2024-05-23 - [Responsive Table-to-Card Transformation]
**Learning:** Tables are notoriously difficult to use on mobile. A clean CSS-only solution is to use `display: block` on table elements and `data-label` attributes with pseudo-elements (`:before`) to reconstruct the row as a card. This preserves semantic HTML while significantly improving mobile accessibility.
**Action:** When working with data-heavy dashboards, implement `data-label` on `<td>` cells to support mobile card layouts without duplicating content.

## 2024-05-23 - [Mobile Menu Legibility & Stacking]
**Learning:** Semi-transparent "glass" overlays can fail contrast tests when they overlap text-heavy pages. On mobile, it is safer to use an opaque background for navigation panels and a high z-index (1000+) to ensure the menu remains the primary focus.
**Action:** Use solid backgrounds for full-screen mobile menu overlays and verify legibility against varied background content.
