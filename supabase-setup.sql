-- ============================================================
-- INVENTÁRIO — Schema
-- Execute no Supabase SQL Editor (Settings > SQL Editor > New query)
-- Seguro para rodar múltiplas vezes (IF NOT EXISTS)
-- ============================================================

-- EQUIPES
create table if not exists teams (
  id text primary key,
  name text not null,
  supervisor text,
  created_at timestamptz default now()
);
alter table teams add column if not exists supervisor text;

-- CADASTROS AUXILIARES
create table if not exists categories (
  id text primary key,
  name text not null,
  kind text not null default 'item',   -- 'item' | 'asset'
  created_at timestamptz default now()
);

create table if not exists suppliers (
  id text primary key,
  name text not null,
  contact text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists brands (
  id text primary key,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists locations (
  id text primary key,
  name text not null,
  created_at timestamptz default now()
);

-- ITENS DE ESTOQUE (por equipe; team_id nulo = estoque geral)
create table if not exists items (
  id text primary key,
  team_id text references teams(id) on delete set null,
  category_id text references categories(id) on delete set null,
  supplier_id text references suppliers(id) on delete set null,
  location_id text references locations(id) on delete set null,
  name text not null,
  quantity numeric not null default 0,
  unit_price numeric not null default 0,
  min_quantity numeric not null default 0,
  status text not null default 'disponivel',  -- 'disponivel' | 'manutencao' | 'indisponivel'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table items add column if not exists team_id text references teams(id) on delete set null;
alter table items add column if not exists category_id text references categories(id) on delete set null;
alter table items add column if not exists supplier_id text references suppliers(id) on delete set null;
alter table items add column if not exists location_id text references locations(id) on delete set null;
alter table items add column if not exists min_quantity numeric not null default 0;
alter table items add column if not exists status text not null default 'disponivel';

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
  category_id text references categories(id) on delete set null,
  brand_id text references brands(id) on delete set null,
  location_id text references locations(id) on delete set null,
  tipo text,
  name text not null,
  model text,
  year text,
  plate text,
  vin text,
  supervisor text,
  owner text,
  notes text,
  status text not null default 'disponivel',  -- 'disponivel' | 'em_uso' | 'manutencao'
  verizon text,
  bouncie text,
  samsung text,
  e_pass text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table assets add column if not exists category_id text references categories(id) on delete set null;
alter table assets add column if not exists brand_id text references brands(id) on delete set null;
alter table assets add column if not exists location_id text references locations(id) on delete set null;
alter table assets add column if not exists status text not null default 'disponivel';

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

-- MOVIMENTAÇÕES — trilha de tudo que entra, sai, muda de equipe/local/status
create table if not exists movements (
  id text primary key,
  kind text not null,             -- 'entrada'|'saida'|'transferencia'|'manutencao'|'cadastro'|'edicao'|'exclusao'|'troca_peca'
  entity_type text not null,      -- 'item' | 'asset'
  entity_id text,
  entity_name text not null,
  quantity numeric,
  description text not null,
  team_id text,
  team_name text,
  from_value text,
  to_value text,
  user_name text,
  created_at timestamptz default now()
);
create index if not exists movements_created_at_idx on movements (created_at desc);
create index if not exists movements_entity_idx on movements (entity_type, entity_id);

-- App interno, usuário único autenticado no próprio app (sem Supabase Auth) — RLS desabilitado
alter table teams                disable row level security;
alter table categories           disable row level security;
alter table suppliers            disable row level security;
alter table brands               disable row level security;
alter table locations            disable row level security;
alter table items                disable row level security;
alter table invoices             disable row level security;
alter table assets               disable row level security;
alter table asset_parts_history  disable row level security;
alter table movements            disable row level security;
