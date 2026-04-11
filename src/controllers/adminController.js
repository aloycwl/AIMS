import { page } from '../lib/render.js';
import { nowISO, parseLines } from '../lib/utils.js';

export class AdminController {
  constructor(sb, one) {
    this.sb = sb;
    this.one = one;
  }

  adminOnly(req, res) {
    if (!req.user.is_admin) {
      res.status(403).send('Admin only');
      return false;
    }
    return true;
  }

  async getAdmin(req, res) {
    if (!this.adminOnly(req, res)) return;

    const [users, roles, subs, rewards] = await Promise.all([
      this.sb('users?select=id'),
      this.sb('roles?select=*&order=popular.desc,name.asc'),
      this.sb('subscriptions?select=id'),
      this.sb('rewards?select=id')
    ]);

    const selectedRoleId = req.query.role_id || roles[0]?.id;
    const selectedRole = roles.find((role) => role.id === selectedRoleId) || roles[0] || null;
    const selectedRoleContent = selectedRole
      ? await this.one(`staffing_role_page_content?role_id=eq.${selectedRole.id}&select=*`)
      : null;
    const fallbackDefault = await this.one('staffing_role_page_content?key=eq.default&select=*');
    const cmsContent = selectedRoleContent || fallbackDefault;

    const roleRows = roles.map((r) => `<tr><td>${r.name}</td><td>${r.monthly_price}</td><td>${r.popular ? 'Yes' : 'No'}</td><td>
      <form method='post' action='/admin/roles/${r.id}/update' class='inline'>
        <input name='name' value='${r.name}' required />
        <input name='monthly_price' type='number' value='${r.monthly_price}' required />
        <input name='capabilities' value='${r.capabilities}' required />
        <label><input type='checkbox' name='popular' ${r.popular ? 'checked' : ''}/>Popular</label>
        <button class='small'>Update</button>
      </form>
      <form method='get' action='/admin' class='inline'>
        <input type='hidden' name='role_id' value='${r.id}' />
        <button class='small'>Edit CMS</button>
      </form>
      <form method='post' action='/admin/roles/${r.id}/delete'><button class='small danger'>Delete</button></form>
    </td></tr>`).join('');

    const checklistText = (Array.isArray(cmsContent?.checklist_items) ? cmsContent.checklist_items : []).join('\n');

    const cmsSection = selectedRole
      ? `<section class='panel'><h3>Staffing Detail Page CMS (${selectedRole.name})</h3><p class='muted'>This content applies only to <b>${selectedRole.name}</b> and appears at <code>/staffing/${selectedRole.id}</code>.</p><form method='post' action='/admin/staffing-role-page-content'><input type='hidden' name='role_id' value='${selectedRole.id}'/><label>Checklist Title</label><input name='checklist_title' value='${cmsContent?.checklist_title || 'Setup checklist'}' required/><label>Checklist Items (one per line)</label><textarea name='checklist_items' rows='6' required>${checklistText || `Create your Telegram access channel.
Upload SOP + KPIs in dashboard notes.
Assign data sources and response guardrails.
Activate QA review mode for the first 72 hours.`}</textarea><label>Terms Title</label><input name='terms_title' value='${cmsContent?.terms_title || 'Commercial terms'}' required/><label>Billing Note</label><input name='billing_note' value='${cmsContent?.billing_note || 'Billing: Demo-only for this environment.'}' required/><button>Save role content</button></form></section>`
      : `<section class='panel'><h3>Staffing Detail Page CMS</h3><p class='muted'>Create at least one role first to manage per-catalog detail page content.</p></section>`;

    const html = `<section class='panel'><h2>Admin CMS</h2><p class='muted'>Manage your storefront catalog and staffing detail content from one place.</p><div class='stats'><div><span>Users</span><strong>${users.length}</strong></div><div><span>Subscriptions</span><strong>${subs.length}</strong></div><div><span>Rewards</span><strong>${rewards.length}</strong></div><div><span>Roles</span><strong>${roles.length}</strong></div></div></section>
      <section class='panel'><h3>Add Staffing Role</h3><form method='post' action='/admin/roles'><label for='role_name'>Name</label><input id='role_name' name='name' placeholder='e.g. Content Creator' required/><label for='role_price'>Monthly Price</label><input id='role_price' name='monthly_price' type='number' placeholder='0'/><label for='role_caps'>Capabilities</label><input id='role_caps' name='capabilities' placeholder='e.g. SEO, Blogging' required/><label><input type='checkbox' name='popular'/> Mark as popular</label><button>Add role</button></form></section>
      ${cmsSection}
      <section class='panel'><h3>Role Catalog Management</h3><table><tr><th>Name</th><th>Price</th><th>Popular</th><th>Actions</th></tr>${roleRows}</table></section>`;

    res.send(page('Admin', html, req.user, req.path));
  }

  async postAddRole(req, res) {
    if (!this.adminOnly(req, res)) return;

    await this.sb('roles', {
      method: 'POST',
      body: [{
        name: req.body.name,
        monthly_price: Number(req.body.monthly_price || 0),
        capabilities: req.body.capabilities,
        popular: req.body.popular === 'on'
      }]
    });

    res.redirect('/admin');
  }

  async postUpdateRole(req, res) {
    if (!this.adminOnly(req, res)) return;

    await this.sb(`roles?id=eq.${req.params.id}`, {
      method: 'PATCH',
      body: {
        name: req.body.name,
        monthly_price: Number(req.body.monthly_price || 0),
        capabilities: req.body.capabilities,
        popular: req.body.popular === 'on'
      }
    });

    res.redirect('/admin');
  }

  async postDeleteRole(req, res) {
    if (!this.adminOnly(req, res)) return;

    await this.sb(`roles?id=eq.${req.params.id}`, { method: 'DELETE', prefer: 'return=minimal' });
    res.redirect('/admin');
  }

  async postCMSContent(req, res) {
    if (!this.adminOnly(req, res)) return;

    const roleId = req.body.role_id;
    if (!roleId) {
      return res.status(400).send('Missing role_id');
    }

    const checklistItems = parseLines(req.body.checklist_items);
    await this.sb('staffing_role_page_content?on_conflict=role_id', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates,return=representation',
      body: [{
        role_id: roleId,
        checklist_title: req.body.checklist_title,
        checklist_items: checklistItems,
        terms_title: req.body.terms_title,
        billing_note: req.body.billing_note,
        updated_at: nowISO()
      }]
    });

    res.redirect(`/admin?role_id=${encodeURIComponent(roleId)}`);
  }
}
