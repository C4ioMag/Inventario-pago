-- ============================================================
-- ESTOQUE — Schema
-- Execute no Supabase SQL Editor (Settings > SQL Editor > New query)
-- Seguro para rodar múltiplas vezes (IF NOT EXISTS)
-- ============================================================

-- EQUIPES
create table if not exists teams (
  id text primary key,
  name text not null,
  created_at timestamptz default now()
);

-- ITENS DE ESTOQUE (por equipe; team_id nulo = estoque geral / sem equipe)
create table if not exists items (
  id text primary key,
  team_id text references teams(id) on delete set null,
  name text not null,
  quantity numeric not null default 0,
  unit_price numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table items add column if not exists team_id text references teams(id) on delete set null;

-- Numeração sequencial de invoices (começa em 1001)
create sequence if not exists invoice_number_seq start 1001;

-- INVOICES
create table if not exists invoices (
  id text primary key,
  invoice_number integer not null default nextval('invoice_number_seq'),
  item_id text references items(id) on delete set null,
  item_name text not null,
  quantity numeric not null,
  unit_price numeric not null default 0,
  total numeric not null default 0,
  machine text not null,
  vin text not null,
  created_at timestamptz default now()
);

-- ASSETS (veículos, trailers, máquinas)
create table if not exists assets (
  id text primary key,
  team_id text references teams(id) on delete set null,
  tipo text,
  name text not null,
  model text,
  year text,
  plate text,
  vin text,
  supervisor text,
  owner text,
  notes text,
  verizon text,
  bouncie text,
  samsung text,
  e_pass text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- HISTÓRICO DE PEÇAS TROCADAS POR ASSET
create table if not exists asset_parts_history (
  id text primary key,
  asset_id text not null references assets(id) on delete cascade,
  item_id text references items(id) on delete set null,
  part_name text not null,
  quantity numeric not null default 1,
  date text not null,
  notes text,
  created_at timestamptz default now()
);

-- App interno, usuário único autenticado no próprio app (sem Supabase Auth) — RLS desabilitado
alter table teams                disable row level security;
alter table items                disable row level security;
alter table invoices             disable row level security;
alter table assets               disable row level security;
alter table asset_parts_history  disable row level security;
