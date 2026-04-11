import { page } from '../lib/render.js';

export class PublicController {
  constructor(sb, one, currentUser) {
    this.sb = sb;
    this.one = one;
    this.currentUser = currentUser;
  }


  async getHome(req, res) {
    const user = await this.currentUser(req);
    const html = `<section class='hero tech-hero'>
  <div class='hero-content'>
    <div class='tech-badge'><span>v2.0 LIVE</span> Next-Gen AI Operations</div>
    <h1 class='glitch-text' data-text='AIMS'>AIMS</h1>
    <h2 class='sub-hero'>AI Management System</h2>
    <p>AIMS is the autonomous command center for your entire workforce. Orchestrate AI agents, scale decentralized operations, and drive hyper-growth through an integrated referral economy.</p>

    <div class='actions hero-actions'>
      <a class='btn tech-btn pulse-border' href='/deploy'>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        Launch OpenClaw Core
      </a>
      <a class='btn ghost tech-btn-outline' href='/staffing'>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        Explore AI Staffing
      </a>
    </div>

    <div class='tech-stats'>
      <div class='stat-item'>
        <strong><span class="counter" data-target="99.99">99.99</span>%</strong>
        <span>Uptime</span>
      </div>
      <div class='stat-item'>
        <strong><span class="counter" data-target="12">12</span>+</strong>
        <span>AI Agent Roles</span>
      </div>
      <div class='stat-item'>
        <strong><span class="counter" data-target="50">50</span>%</strong>
        <span>Direct Reward</span>
      </div>
    </div>
  </div>
  <div class='hero-visual'>
    <div class='tech-orb'></div>
    <div class='tech-grid'></div>
    <img src='https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80' alt='Global Tech Network' />
  </div>
</section>

<section class='tech-section'>
  <div class='section-header text-center'>
    <span class='tech-label'>INFRASTRUCTURE</span>
    <h2>The Command Core</h2>
    <p class='muted'>Modular architecture designed for unstoppable scaling.</p>
  </div>

  <div class='grid feature-grid tech-cards'>
    <article class='card glass-card'>
      <div class='card-icon blue-glow'>
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
      </div>
      <h3>OpenClaw Deployment</h3>
      <p>Simulate fast payment cycles and instantly provision your agent telemetry network securely on our decentralized grid.</p>
    </article>

    <article class='card glass-card'>
      <div class='card-icon purple-glow'>
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      </div>
      <h3>Autonomous Agent Staffing</h3>
      <p>Access our 12-role catalog featuring CMS-driven capability updates. Each agent runs on specialized knowledge graphs.</p>
    </article>

    <article class='card glass-card'>
      <div class='card-icon green-glow'>
        <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
      </div>
      <h3>Referral Economics</h3>
      <p>Grow via integrated mechanics: 50% direct payout plus a dynamically weighted 20% upline pool to maximize expansion.</p>
    </article>
  </div>
</section>

<script>
  // Simple counter animation
  const counters = document.querySelectorAll('.counter');
  counters.forEach(counter => {
    const target = parseFloat(counter.getAttribute('data-target'));
    const isFloat = counter.getAttribute('data-target').includes('.');
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;

    const updateCounter = () => {
      current += step;
      if (current < target) {
        counter.innerText = isFloat ? current.toFixed(2) : Math.ceil(current);
        requestAnimationFrame(updateCounter);
      } else {
        counter.innerText = target;
      }
    };
    updateCounter();
  });
</script>`;
    res.send(page('AIMS', html, user, req.path));
  }


  async getDeploy(req, res) {
    const user = await this.currentUser(req);
    const plans = await this.sb('plans?select=*&order=price.asc');
    const rows = plans.map((p) => `<tr><td data-label='Price (USD)'>$${p.price}</td><td data-label='Duration'>${p.label}</td><td data-label='Shares'>${p.shares}</td><td data-label='Bonus'>+${p.bonus_pct}%</td><td data-label='Discount'>${p.discount_pct}%</td><td class='action-cell'><div class='inline'><a class='btn small' href='/pay/${p.price}?currency=usd'>Pay (USD)</a><a class='btn small ghost' href='/pay/${p.price}?currency=sgd' title='Pay with PayNow (1 USD = 1.27 SGD)'>Pay (SGD)</a></div></td></tr>`).join('');
    res.send(page('Deploy', `<section class='panel'><h2>OpenClaw 1-Click Deploy</h2><p>Select a plan to simulate payment and instant provisioning orchestration.</p><table><thead><tr><th>Price (USD)</th><th>Duration</th><th>Shares</th><th>Bonus</th><th>Discount</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table></section>`, user, req.path));
  }

  async getStaffing(req, res) {
    const user = await this.currentUser(req);
    const roles = await this.sb('roles?select=*&order=popular.desc,name.asc');
    const cards = roles.map((r) => `<article class='card role'><h3>${r.name}${r.popular ? `<span class='tag'>Most Popular</span>` : ''}</h3><p>${r.capabilities}</p><p class='price'>${Number(r.monthly_price) === 0 ? 'Free' : `$${r.monthly_price}/mo`}</p><a class='btn small' href='/staffing/${r.id}'>Hire now</a></article>`).join('');
    res.send(page('Staffing', `<section class='hero'><div><p class='eyebrow'>Global Talent</p><h2>AI Agent Staffing</h2><p>Deploy specialized digital workers with standardized onboarding instructions. Our agents are pre-trained on industry-specific datasets to deliver immediate value.</p></div><img src='https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=800&q=80' alt='High-tech digital interface' /></section><section class='panel'><div class='grid'>${cards}</div></section>`, user, req.path));
  }

  async getStaffingById(req, res) {
    const user = await this.currentUser(req);
    const role = await this.one(`roles?id=eq.${encodeURIComponent(req.params.id)}&select=*`);
    if (!role) return res.status(404).send('Role not found');

    const cms = await this.one(`staffing_role_page_content?role_id=eq.${encodeURIComponent(req.params.id)}&select=*`)
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

    res.send(page(role.name, `<section class='panel'><h2>${role.name}</h2><p>${role.capabilities}</p><div class='two-col'><div><h3>${checklistTitle}</h3><ol>${checklistHtml}</ol></div><div class='info'><h3>${termsTitle}</h3><p>Monthly Price: <b>${Number(role.monthly_price) === 0 ? 'Free' : '$' + role.monthly_price}</b></p><p>${billingNote}</p></div></div></section>`, user, req.path));
  }

  async getReferrals(req, res) {
    const user = await this.currentUser(req);
    res.send(page('Referral Model', `<section class='hero'><div><p class='eyebrow'>Referral economics</p><h2>Referral & Group Reward System</h2><p>Simple at the top-level, precise at payout-time: direct rewards, weighted group sharing, and capped earning per subscription cycle.</p><div class='reward-pillars' style='margin-top:20px'><div><span>Direct</span><strong>50%</strong></div><div><span>Group Pool</span><strong>20%</strong></div><div><span>Earning Cap</span><strong>2×</strong></div></div></div><img src='https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80' alt='Data visualization' /></section><section class='panel'><h3>How funds move on each subscription</h3><div class='flow-grid'><article class='flow-card'><div class='flow-index'>1</div><h4>Buyer subscribes</h4><p>Any plan payment activates direct + group calculations.</p></article><article class='flow-card'><div class='flow-index'>2</div><h4>Direct reward</h4><p>Immediate upline receives <b>50%</b> of payment amount.</p></article><article class='flow-card'><div class='flow-index'>3</div><h4>Group pool</h4><p><b>20%</b> is split by weighted share across eligible uplines.</p></article><article class='flow-card'><div class='flow-index'>4</div><h4>Cap protection</h4><p>Earning pauses once user reaches <b>2×</b> their subscription amount.</p></article></div><div class='equation'>Group reward formula: <code>reward = group_pool × (member_shares / total_upline_shares)</code></div></section><section class='panel'><h3>Cycle behavior (important)</h3><div class='two-col'><div><ul><li>Shares are tied to an active earning cycle.</li><li>After hitting 2× and exiting, old cycle share no longer applies.</li><li>On re-subscription, new cycle starts with fresh shares for that plan.</li><li>This prevents old and new cycle shares from stacking unfairly.</li></ul></div><div class='info'><h4>Worked scenario</h4><p>Buy <b>$50</b> → share <b>50</b> → earn <b>$100</b> (cap reached) → exit.</p><p>Subscribe again <b>$50</b> → share resets to <b>50</b> (not 100).</p><p class='muted'>Result: each cycle keeps independent share weight.</p></div></div></section><section class='panel'><h3>Visual referral chain</h3><div class='chain'><div class='node'>A (500 shares)</div><div class='arrow'>→</div><div class='node'>B (100 shares)</div><div class='arrow'>→</div><div class='node active'>C (buyer)</div></div><p style='text-align:center'>Group split example: A gets <b>20% × 500/600</b>, B gets <b>20% × 100/600</b>.</p></section>`, user, req.path));
  }
}
