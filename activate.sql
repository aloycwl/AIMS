create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password text not null,
  referral_code text unique not null,
  referred_by text,
  is_admin boolean not null default false,
  total_subscribed numeric(14,2) not null default 0,
  total_earned numeric(14,2) not null default 0,
  share_balance bigint not null default 0,
  wallet_usdt numeric(14,2) not null default 0,
  openclaw_ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  price numeric(14,2) unique not null,
  duration_days integer not null,
  shares bigint not null,
  bonus_pct integer not null default 0,
  discount_pct integer not null default 0,
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  monthly_price numeric(14,2) not null default 0,
  capabilities text not null,
  popular boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists staffing_role_page_content (
  id uuid default gen_random_uuid(),
  role_id uuid unique references roles(id) on delete cascade,
  key text unique,
  checklist_title text not null,
  checklist_items jsonb not null default '[]'::jsonb,
  terms_title text not null,
  billing_note text not null,
  updated_at timestamptz not null default now()
);

alter table staffing_role_page_content add column if not exists id uuid default gen_random_uuid();
alter table staffing_role_page_content add column if not exists role_id uuid references roles(id) on delete cascade;
alter table staffing_role_page_content add column if not exists key text;

do $$
begin
  alter table staffing_role_page_content add constraint staffing_role_page_content_role_id_unique unique (role_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table staffing_role_page_content add constraint staffing_role_page_content_key_unique unique (key);
exception
  when duplicate_object then null;
end $$;

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  plan_id uuid references plans(id) on delete set null,
  price numeric(14,2) not null,
  duration_days integer not null,
  shares_granted bigint not null,
  status text not null,
  provision_at timestamptz,
  expires_at timestamptz,
  instance_ip text,
  telegram_id text,
  created_at timestamptz not null default now()
);

alter table subscriptions add column if not exists expires_at timestamptz;

create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  from_user_id uuid references users(id) on delete set null,
  amount numeric(14,2) not null,
  type text not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  address text not null,
  amount numeric(14,2) not null,
  network text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_referral_code on users(referral_code);
create index if not exists idx_users_email on users(email);
create index if not exists idx_subscriptions_user_id on subscriptions(user_id);
create index if not exists idx_rewards_user_id on rewards(user_id);
create index if not exists idx_withdrawals_user_id on withdrawals(user_id);

insert into users (email, password, referral_code, is_admin)
values ('aloycwl@gmail.com', 'Password123', 'ALOYCWL', true)
on conflict (email) do nothing;

insert into plans (price, duration_days, shares, bonus_pct, discount_pct, label) values
(50, 7, 50, 0, 0, '1 Week'),
(200, 30, 105, 5, 0, '1 Month'),
(500, 90, 660, 10, 15, '3 Months'),
(1000, 180, 1380, 15, 15, '6 Months'),
(1920, 365, 2880, 20, 20, '1 Year'),
(3840, 730, 6000, 25, 20, '2 Years'),
(5400, 1095, 9360, 30, 25, '3 Years'),
(9000, 1825, 16800, 40, 25, '5 Years'),
(16800, 3650, 36000, 50, 30, '1 Decade')
on conflict (price) do nothing;

insert into roles (name, monthly_price, capabilities, popular) values
('Marketing Person', 0, 'Top-rated growth engine for campaign strategy and lead conversion.', true),
('Sales Closer AI', 149, 'Closes high-intent leads with objection-handling scripts.', false),
('Customer Support Agent', 79, '24/7 support triage and response handling.', false),
('Social Media Strategist', 99, 'Plans content calendars and growth loops.', false),
('HR Screening Assistant', 59, 'Screens and ranks candidates automatically.', false),
('Finance Ops Assistant', 129, 'Tracks invoices, expenses, and reconciliation.', false),
('SEO Content Agent', 89, 'Builds SEO briefs and optimized drafts.', false),
('Outbound SDR Agent', 119, 'Runs prospecting and outreach workflows.', false),
('Operations Coordinator', 109, 'Keeps SOP tasks and team automation moving.', false),
('Project Manager AI', 139, 'Manages sprint cadence and delivery updates.', false),
('Legal Intake Assistant', 169, 'Collects intake and drafts initial legal docs.', false),
('Ecommerce Merchandiser', 95, 'Optimizes listings, bundles, and promotions.', false)
on conflict (name) do nothing;

insert into staffing_role_page_content (key, checklist_title, checklist_items, terms_title, billing_note, updated_at) values
('default', 'Setup checklist', '["Create your Telegram access channel.","Upload SOP + KPIs in dashboard notes.","Assign data sources and response guardrails.","Activate QA review mode for the first 72 hours."]'::jsonb, 'Commercial terms', 'Billing: Demo-only for this environment.', now())
on conflict (key) do update set
  checklist_title = excluded.checklist_title,
  checklist_items = excluded.checklist_items,
  terms_title = excluded.terms_title,
  billing_note = excluded.billing_note,
  updated_at = excluded.updated_at;
