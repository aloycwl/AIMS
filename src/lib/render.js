export function nav(user) {
  const authLinks = user
    ? `<a href='/dashboard'>Dashboard</a><a href='/logout'>Logout</a>${user.is_admin ? `<a href='/admin'>Admin</a>` : ''}`
    : `<a href='/login'>Login</a><a href='/register'>Register</a>`;

  return `<nav><a href='/'>AIMS</a><a href='/deploy'>1-Click Deploy</a><a href='/staffing'>AI Staffing</a><a href='/referrals'>Referral Model</a>${authLinks}</nav>`;
}

export function page(title, body, user = null) {
  return `<!doctype html><html><head><meta charset='utf-8'/><meta name='viewport' content='width=device-width,initial-scale=1'/><title>${title}</title><link rel='stylesheet' href='/static/style.css'></head><body>${nav(user)}<main>${body}</main><footer><p>© AIMS Demo Platform • Built for staged production growth.</p></footer></body></html>`;
}
