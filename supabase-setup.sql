-- ============================================================
-- ESTOQUE — Schema
-- Execute no Supabase SQL Editor (Settings > SQL Editor > New query)
-- Seguro para rodar múltiplas vezes (IF NOT EXISTS)
-- ============================================================

-- ITENS DE ESTOQUE
create table if not exists items (
  id text primary key,
  name text not null,
  quantity numeric not null default 0,
  unit_price numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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

-- App interno, usuário único autenticado no próprio app (sem Supabase Auth) — RLS desabilitado
alter table items    disable row level security;
alter table invoices disable row level security;
