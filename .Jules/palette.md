## 2024-05-22 - [High-Tech Glassmorphism & Active Nav States]
**Learning:** For SaaS dashboards, "glassmorphism" (semi-transparent backgrounds + backdrop-filter blur) provides a modern feel while maintaining readability. Active navigation states are crucial for user orientation and should be handled by the central renderer using `req.path`.
**Action:** Always implement a central `page()` or `render()` function that accepts the current path to automate navigation highlighting.

## 2024-05-22 - [Accessibility: Labelling forms]
**Learning:** Many older Express/EJS apps forget to link `<label>` to `<input>` with `id`/`for`. This breaks screen readers and prevents users from clicking labels to focus inputs.
**Action:** Audit all forms during the discovery phase and ensure every input has a unique `id` and a corresponding `label`.

## 2024-05-22 - [Currency: SGD PayNow Integration]
**Learning:** Stripe PayNow requires `sgd` currency and specific checkout configurations. When using fixed conversion rates (e.g., 1.27), both the checkout amount and the subsequent wallet crediting must use the same constant to prevent balance leakage.
**Action:** Centralize currency conversion constants in the `StripeService` or a config file, and ensure they are passed through Stripe's `metadata` for reliable processing on success.

## 2024-05-23 - [Responsive Table-to-Card Transformation]
**Learning:** Tables are notoriously difficult to use on mobile. A clean CSS-only solution is to use `display: block` on table elements and `data-label` attributes with pseudo-elements (`:before`) to reconstruct the row as a card. This preserves semantic HTML while significantly improving mobile accessibility.
**Action:** When working with data-heavy dashboards, implement `data-label` on `<td>` cells to support mobile card layouts without duplicating content.

## 2024-05-23 - [Professionalizing "Tech" Aesthetics]
**Learning:** A "neon" or "tech" theme can quickly look dated if overdone. Using high-end typography (Inter), subtle glassmorphism (lower opacity + higher blur), and entrance animations (section reveal) creates a "premium SaaS" feel rather than a "gaming" look.
**Action:** Balance glow effects with plenty of negative space and crisp typography to maintain a professional brand identity.
