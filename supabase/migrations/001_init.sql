-- Enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type user_role as enum ('customer','cashier','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dine_option as enum ('dine_in','takeaway');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum ('pending','paid','preparing','ready','delivered','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('QRIS','CASH');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending','verified','failed','refunded');
exception when duplicate_object then null; end $$;

-- profiles (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text,
  phone text,
  role user_role not null default 'customer',
  created_at timestamptz not null default now()
);

-- stalls (kios)
create table if not exists public.stalls (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- menu_items
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  stall_id uuid not null references public.stalls(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  category text,
  price numeric(12,2) not null check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_menu_items_stall on public.menu_items(stall_id);
create index if not exists idx_menu_items_active on public.menu_items(is_active);

-- orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.profiles(id) on delete set null, -- optional if logged-in
  customer_email text not null,
  customer_name text not null,
  phone text,
  dine_option dine_option not null,
  table_no text not null,
  status order_status not null default 'pending',
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  stall_breakdown jsonb not null default '{}',
  public_token uuid not null default gen_random_uuid(), -- for /status by token via API
  created_at timestamptz not null default now()
);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at);
create index if not exists idx_orders_customer_email on public.orders(customer_email);

-- order_items
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id),
  stall_id uuid not null references public.stalls(id),
  qty int not null check (qty > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_stall on public.order_items(stall_id);

-- payments
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  method payment_method not null,
  status payment_status not null default 'pending',
  qris_ref text, -- reference/transaction id from provider
  paid_at timestamptz,
  cashier_id uuid references public.profiles(id),
  idempotency_key text unique, -- prevent double create/verify
  created_at timestamptz not null default now()
);
create index if not exists idx_payments_status on public.payments(status);

-- audit_logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  actor_id uuid references public.profiles(id),
  entity text not null,
  entity_id uuid,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_created_at on public.audit_logs(created_at);

-- PUBLIC READ policies for menu & stalls, locked writes
alter table public.stalls enable row level security;
alter table public.menu_items enable row level security;
alter table public.profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.audit_logs enable row level security;

-- profiles
create policy "profiles self read" on public.profiles
for select using (auth.uid() = id);

create policy "profiles self update" on public.profiles
for update using (auth.uid() = id);

-- stalls/menu_items: readable by anyone, modifiable by admin/cashier
create policy "stalls read all" on public.stalls for select using (true);
create policy "menu_items read all" on public.menu_items for select using (is_active = true);

create policy "stalls write staff" on public.stalls
for all using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','cashier')));

create policy "menu_items write staff" on public.menu_items
for all using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','cashier')));

-- orders: authenticated customers can read own orders; writes handled server-side w/ service role
create policy "orders read own (auth)" on public.orders
for select using (
  auth.uid() is not null
  and customer_id = auth.uid()
);

-- order_items: readable via parent order
create policy "order_items read via parent" on public.order_items
for select using (
  exists(select 1 from public.orders o where o.id = order_items.order_id and (
    (auth.uid() is not null and o.customer_id = auth.uid())
  ))
);

-- payments: readable for staff; customers read via API route only
create policy "payments read staff" on public.payments
for select using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','cashier')));

-- audit_logs: staff read
create policy "audit read staff" on public.audit_logs
for select using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','cashier')));

-- NOTE:
-- Insert/update of orders, order_items, payments dilakukan dari server (Next Route Handler / Edge Function)
-- menggunakan SERVICE ROLE, sehingga melewati RLS namun tetap tervalidasi oleh zod & kontrol aplikasi.
