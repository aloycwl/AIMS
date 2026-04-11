export function nav(user, currentPath = '') {
  const links = [
    { href: '/', label: 'AIMS' },
    { href: '/deploy', label: '1-Click Deploy' },
    { href: '/staffing', label: 'AI Staffing' },
    { href: '/referrals', label: 'Referral Model' },
  ];

  if (user) {
    links.push({ href: '/dashboard', label: 'Dashboard' });
    if (user.is_admin) {
      links.push({ href: '/admin', label: 'Admin' });
    }
  } else {
    links.push({ href: '/login', label: 'Login' });
    links.push({ href: '/register', label: 'Register' });
  }

  const navLinks = links.map(link => {
    const isActive = link.href === '/' ? currentPath === '/' : currentPath.startsWith(link.href);
    const active = isActive ? 'active' : '';
    return `<a href='${link.href}' class='${active}'>${link.label}</a>`;
  }).join('');

  const profileMenu = user
    ? `<details class='profile-menu'><summary>${user.email} ▾</summary><div class='profile-dropdown'><a href='/profile' class='${currentPath === '/profile' ? 'active' : ''}'>Profile</a><a href='/profile#change-password'>Change Password</a><a href='/logout'>Logout</a></div></details>`
    : '';

  return `<nav>
    <button class='menu-toggle' aria-label='Toggle Menu'>
      <svg width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><line x1='3' y1='12' x2='21' y2='12'></line><line x1='3' y1='6' x2='21' y2='6'></line><line x1='3' y1='18' x2='21' y2='18'></line></svg>
    </button>
    <div class='nav-links'>${navLinks}</div>
    ${profileMenu}
  </nav>`;
}

export function page(title, body, user = null, currentPath = '') {
  return `<!doctype html><html><head><meta charset='utf-8'/><meta name='viewport' content='width=device-width,initial-scale=1'/><title>${title} | AIMS</title><link rel='stylesheet' href='/static/style.css'></head><body>${nav(user, currentPath)}<main>${body}</main><footer><p>© AIMS Demo Platform • Built for staged production growth.</p></footer><script>
    const toggle = document.querySelector('.menu-toggle');
    const links = document.querySelector('.nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', () => {
        links.classList.toggle('open');
      });
    }
  </script></body></html>`;
}
