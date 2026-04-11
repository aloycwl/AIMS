import { page } from '../lib/render.js';

export class PublicController {
  constructor(sb, one, currentUser) {
    this.sb = sb;
    this.one = one;
    this.currentUser = currentUser;
  }

  async getHome(req, res) {
    const user = await this.currentUser(req);
    const html = `<section class='hero'><div><h1>AIMS — AI Management System</h1><p>Production-ready structure for OpenClaw deployment, AI staffing commerce, and referral operations.</p><div class='actions'><a class='btn' href='/deploy'>Launch 1-Click Deploy</a><a class='btn ghost' href='/staffing'>View AI Staffing</a></div></div><img src='https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80' alt='AI server room' /></section><section class='grid feature-grid'><article class='card'><h3>OpenClaw Subscription</h3><p>Fast payment simulation and provisioning telemetry.</p></article><article class='card'><h3>Agent Staffing</h3><p>12 role catalog with CMS-driven expansion.</p></article><article class='card'><h3>Referral Economics</h3><p>50% direct and weighted 20% upline pool.</p></article></section>`;
    res.send(page('AIMS', html, user));
  }

  async getDeploy(req, res) {
    const user = await this.currentUser(req);
    const plans = await this.sb('plans?select=*&order=price.asc');
    const rows = plans.map((p) => `
      <tr>
        <td>$${p.price}</td>
        <td>${p.label}</td>
        <td>${p.shares}</td>
        <td>+${p.bonus_pct}%</td>
        <td>${p.discount_pct}%</td>
        <td>
          <div class='actions vertical'>
            <a class='btn small' href='/pay/${p.price}?method=card'>Card/Alipay</a>
            <a class='btn small ghost' href='/pay/${p.price}?method=paynow'>PayNow (SGD)</a>
          </div>
        </td>
      </tr>`).join('');
    res.send(page('Deploy', `<section class='panel'><h2>OpenClaw 1-Click Deploy</h2><p>Select a plan and payment method.</p><table><tr><th>Price</th><th>Duration</th><th>Shares</th><th>Bonus</th><th>Discount</th><th>Action</th></tr>${rows}</table></section>`, user));
  }

  async getStaffing(req, res) {
    const user = await this.currentUser(req);
    const roles = await this.sb('roles?select=*&order=popular.desc,name.asc');
    const cards = roles.map((r) => `<article class='card role'><h3>${r.name}${r.popular ? `<span class='tag'>Most Popular</span>` : ''}</h3><p>${r.capabilities}</p><p class='price'>${Number(r.monthly_price) === 0 ? 'Free' : `$${r.monthly_price}/mo`}</p><a class='btn small' href='/staffing/${r.id}'>Hire now</a></article>`).join('');
    res.send(page('Staffing', `<section class='panel'><h2>AI Agent Staffing</h2><p>Deploy specialized digital workers with standardized onboarding instructions.</p><div class='grid'>${cards}</div></section>`, user));
  }

  async getStaffingById(req, res) {
    const user = await this.currentUser(req);
    const role = await this.one(`roles?id=eq.${req.params.id}&select=*`);
    if (!role) return res.status(404).send('Role not found');

    const cms = await this.one(`staffing_role_page_content?role_id=eq.${req.params.id}&select=*`)
      || await this.one('staffing_role_page_content?key=eq.default&select=*');
    const checklistTitle = cms?.checklist_title || 'Setup checklist';
    const checklistItems = Array.isArray(cms?.checklist_items) && cms.checklist_items.length
      ? cms.checklist_items
      : [
        'Create your Telegram access channel.',
        'Upload SOP + KPIs in dashboard notes.',
        'Assign data sources and response guardrails.',
        'Activate QA review mode for the first 72 hours.'
      ];
    const termsTitle = cms?.terms_title || 'Commercial terms';
    const billingNote = cms?.billing_note || 'Billing: Demo-only for this environment.';
    const checklistHtml = checklistItems.map((i) => `<li>${i}</li>`).join('');

    res.send(page(role.name, `<section class='panel'><h2>${role.name}</h2><p>${role.capabilities}</p><div class='two-col'><div><h3>${checklistTitle}</h3><ol>${checklistHtml}</ol></div><div class='info'><h3>${termsTitle}</h3><p>Monthly Price: <b>${Number(role.monthly_price) === 0 ? 'Free' : '$' + role.monthly_price}</b></p><p>${billingNote}</p></div></div></section>`, user));
  }

  async getReferrals(req, res) {
    const user = await this.currentUser(req);
    res.send(page('Referral Model', `<section class='panel referral-hero'><div><p class='eyebrow'>Referral economics</p><h2>Referral & Group Reward System</h2><p class='muted'>Simple at the top-level, precise at payout-time: direct rewards, weighted group sharing, and capped earning per subscription cycle.</p></div><div class='reward-pillars'><div><span>Direct</span><strong>50%</strong></div><div><span>Group Pool</span><strong>20%</strong></div><div><span>Earning Cap</span><strong>2×</strong></div></div></section><section class='panel'><h3>How funds move on each subscription</h3><div class='flow-grid'><article class='flow-card'><div class='flow-index'>1</div><h4>Buyer subscribes</h4><p>Any plan payment activates direct + group calculations.</p></article><article class='flow-card'><div class='flow-index'>2</div><h4>Direct reward</h4><p>Immediate upline receives <b>50%</b> of payment amount.</p></article><article class='flow-card'><div class='flow-index'>3</div><h4>Group pool</h4><p><b>20%</b> is split by weighted share across eligible uplines.</p></article><article class='flow-card'><div class='flow-index'>4</div><h4>Cap protection</h4><p>Earning pauses once user reaches <b>2×</b> their subscription amount.</p></article></div><div class='equation'>Group reward formula: <code>reward = group_pool × (member_shares / total_upline_shares)</code></div></section><section class='panel'><h3>Cycle behavior (important)</h3><div class='two-col'><div><ul><li>Shares are tied to an active earning cycle.</li><li>After hitting 2× and exiting, old cycle share no longer applies.</li><li>On re-subscription, new cycle starts with fresh shares for that plan.</li><li>This prevents old and new cycle shares from stacking unfairly.</li></ul></div><div class='info'><h4>Worked scenario</h4><p>Buy <b>$50</b> → share <b>50</b> → earn <b>$100</b> (cap reached) → exit.</p><p>Subscribe again <b>$50</b> → share resets to <b>50</b> (not 100).</p><p class='muted'>Result: each cycle keeps independent share weight.</p></div></div></section><section class='panel'><h3>Visual referral chain</h3><div class='chain'><div class='node'>A (500 shares)</div><div class='arrow'>→</div><div class='node'>B (100 shares)</div><div class='arrow'>→</div><div class='node active'>C (buyer)</div></div><p>Group split example: A gets <b>20% × 500/600</b>, B gets <b>20% × 100/600</b>.</p></section>`, user));
  }
}
