import { page } from '../lib/render.js';

export function registerPublicRoutes(app, ctx) {
  const { currentUser, sb, one } = ctx;

  app.get('/', async (req, res) => {
    const user = await currentUser(req);
    const html = `<section class='hero'><div><h1>AIMS — AI Management System</h1><p>Production-ready structure for OpenClaw deployment, AI staffing commerce, and referral operations.</p><div class='actions'><a class='btn' href='/deploy'>Launch 1-Click Deploy</a><a class='btn ghost' href='/staffing'>View AI Staffing</a></div></div><img src='https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80' alt='AI server room' /></section><section class='grid feature-grid'><article class='card'><h3>OpenClaw Subscription</h3><p>Fast payment simulation and provisioning telemetry.</p></article><article class='card'><h3>Agent Staffing</h3><p>12 role catalog with CMS-driven expansion.</p></article><article class='card'><h3>Referral Economics</h3><p>50% direct and weighted 20% upline pool.</p></article></section>`;
    res.send(page('AIMS', html, user));
  });

  app.get('/deploy', async (req, res) => {
    const user = await currentUser(req);
    const plans = await sb('plans?select=*&order=price.asc');
    const rows = plans.map((p) => `<tr><td>$${p.price}</td><td>${p.label}</td><td>${p.shares}</td><td>+${p.bonus_pct}%</td><td>${p.discount_pct}%</td><td><a class='btn small' href='/pay/${p.price}'>Choose</a></td></tr>`).join('');
    res.send(page('Deploy', `<section class='panel'><h2>OpenClaw 1-Click Deploy</h2><p>Select a plan to simulate payment and instant provisioning orchestration.</p><table><tr><th>Price</th><th>Duration</th><th>Shares</th><th>Bonus</th><th>Discount</th><th></th></tr>${rows}</table></section>`, user));
  });

  app.get('/staffing', async (req, res) => {
    const user = await currentUser(req);
    const roles = await sb('roles?select=*&order=popular.desc,name.asc');
    const cards = roles.map((r) => `<article class='card role'><h3>${r.name}${r.popular ? `<span class='tag'>Most Popular</span>` : ''}</h3><p>${r.capabilities}</p><p class='price'>${Number(r.monthly_price) === 0 ? 'Free' : `$${r.monthly_price}/mo`}</p><a class='btn small' href='/staffing/${r.id}'>Hire now</a></article>`).join('');
    res.send(page('Staffing', `<section class='panel'><h2>AI Agent Staffing</h2><p>Deploy specialized digital workers with standardized onboarding instructions.</p><div class='grid'>${cards}</div></section>`, user));
  });

  app.get('/staffing/:id', async (req, res) => {
    const user = await currentUser(req);
    const role = await one(`roles?id=eq.${req.params.id}&select=*`);
    if (!role) return res.status(404).send('Role not found');

    const cms = await one(`staffing_role_page_content?role_id=eq.${req.params.id}&select=*`)
      || await one('staffing_role_page_content?key=eq.default&select=*');
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
  });

  app.get('/referrals', async (req, res) => {
    const user = await currentUser(req);
    res.send(page('Referral Model', `<section class='panel'><h2>Referral & Group Reward System</h2><div class='two-col'><div><h3>Payout structure</h3><ul><li>Direct upline receives <b>50%</b> on every subscription payment and renewal.</li><li>An additional <b>20%</b> enters the group pool.</li><li>Pool is split across all uplines to root by share weighting.</li><li>Formula: <code>reward = group_pool × (member_shares / total_upline_shares)</code>.</li></ul></div><div class='info'><h3>Eligibility model</h3><ul><li>User can earn until cumulative rewards hit <b>2× total subscription spend</b>.</li><li>When capped, rewards pause until any new plan is purchased.</li><li>If service duration ends before 2× cap, earning remains active.</li><li>Plan bonus % increases shares granted.</li></ul></div></div><h3>Example</h3><p>A → B → C, with A=500 shares and B=100 shares.</p><p>A gets <b>20% × (500/600)</b>, B gets <b>20% × (100/600)</b>.</p></section>`, user));
  });
}
