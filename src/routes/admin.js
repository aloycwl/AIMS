import { page } from '../lib/render.js';
import { nowISO, parseLines } from '../lib/utils.js';

function adminOnly(req, res) {
  if (!req.user.is_admin) {
    res.status(403).send('Admin only');
    return false;
  }
  return true;
}

export function registerAdminRoutes(app, ctx) {
  const { sb, one, requireAuth } = ctx;

  app.get('/admin', requireAuth, async (req, res) => {
    if (!adminOnly(req, res)) return;

    const [users, roles, subs, rewards, staffingRolePageContent] = await Promise.all([
      sb('users?select=id'),
      sb('roles?select=*&order=popular.desc,name.asc'),
      sb('subscriptions?select=id'),
      sb('rewards?select=id'),
      one('staffing_role_page_content?key=eq.default&select=*')
    ]);

    const roleRows = roles.map((r) => `<tr><td>${r.name}</td><td>${r.monthly_price}</td><td>${r.popular ? 'Yes' : 'No'}</td><td>
      <form method='post' action='/admin/roles/${r.id}/update' class='inline'>
        <input name='name' value='${r.name}' required />
        <input name='monthly_price' type='number' value='${r.monthly_price}' required />
        <input name='capabilities' value='${r.capabilities}' required />
        <label><input type='checkbox' name='popular' ${r.popular ? 'checked' : ''}/>Popular</label>
        <button class='small'>Update</button>
      </form>
      <form method='post' action='/admin/roles/${r.id}/delete'><button class='small danger'>Delete</button></form>
    </td></tr>`).join('');

    const checklistText = (Array.isArray(staffingRolePageContent?.checklist_items) ? staffingRolePageContent.checklist_items : []).join('\n');

    const html = `<section class='panel'><h2>Admin CMS</h2><p class='muted'>Manage your storefront catalog and staffing detail content from one place.</p><div class='stats'><div><span>Users</span><strong>${users.length}</strong></div><div><span>Subscriptions</span><strong>${subs.length}</strong></div><div><span>Rewards</span><strong>${rewards.length}</strong></div><div><span>Roles</span><strong>${roles.length}</strong></div></div></section>
      <section class='panel'><h3>Add Staffing Role</h3><form method='post' action='/admin/roles'><label>Name</label><input name='name' required/><label>Monthly Price</label><input name='monthly_price' type='number'/><label>Capabilities</label><input name='capabilities' required/><label><input type='checkbox' name='popular'/> Mark as popular</label><button>Add role</button></form></section>
      <section class='panel'><h3>Staffing Detail Page CMS</h3><form method='post' action='/admin/staffing-role-page-content'><label>Checklist Title</label><input name='checklist_title' value='${staffingRolePageContent?.checklist_title || 'Setup checklist'}' required/><label>Checklist Items (one per line)</label><textarea name='checklist_items' rows='6' required>${checklistText || `Create your Telegram access channel.
Upload SOP + KPIs in dashboard notes.
Assign data sources and response guardrails.
Activate QA review mode for the first 72 hours.`}</textarea><label>Terms Title</label><input name='terms_title' value='${staffingRolePageContent?.terms_title || 'Commercial terms'}' required/><label>Billing Note</label><input name='billing_note' value='${staffingRolePageContent?.billing_note || 'Billing: Demo-only for this environment.'}' required/><button>Save page content</button></form></section>
      <section class='panel'><h3>Role Catalog Management</h3><table><tr><th>Name</th><th>Price</th><th>Popular</th><th>Actions</th></tr>${roleRows}</table></section>`;

    res.send(page('Admin', html, req.user));
  });

  app.post('/admin/roles', requireAuth, async (req, res) => {
    if (!adminOnly(req, res)) return;

    await sb('roles', {
      method: 'POST',
      body: [{
        name: req.body.name,
        monthly_price: Number(req.body.monthly_price || 0),
        capabilities: req.body.capabilities,
        popular: req.body.popular === 'on'
      }]
    });

    res.redirect('/admin');
  });

  app.post('/admin/roles/:id/update', requireAuth, async (req, res) => {
    if (!adminOnly(req, res)) return;

    await sb(`roles?id=eq.${req.params.id}`, {
      method: 'PATCH',
      body: {
        name: req.body.name,
        monthly_price: Number(req.body.monthly_price || 0),
        capabilities: req.body.capabilities,
        popular: req.body.popular === 'on'
      }
    });

    res.redirect('/admin');
  });

  app.post('/admin/roles/:id/delete', requireAuth, async (req, res) => {
    if (!adminOnly(req, res)) return;

    await sb(`roles?id=eq.${req.params.id}`, { method: 'DELETE', prefer: 'return=minimal' });
    res.redirect('/admin');
  });

  app.post('/admin/staffing-role-page-content', requireAuth, async (req, res) => {
    if (!adminOnly(req, res)) return;

    const checklistItems = parseLines(req.body.checklist_items);
    await sb('staffing_role_page_content?on_conflict=key', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: [{
        key: 'default',
        checklist_title: req.body.checklist_title,
        checklist_items: checklistItems,
        terms_title: req.body.terms_title,
        billing_note: req.body.billing_note,
        updated_at: nowISO()
      }]
    });

    res.redirect('/admin');
  });
}
