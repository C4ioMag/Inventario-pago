-- ============================================================
-- INVENTÁRIO — Schema
-- Execute no Supabase SQL Editor (Settings > SQL Editor > New query)
-- Seguro para rodar múltiplas vezes (IF NOT EXISTS)
-- ============================================================

-- EQUIPES
create table if not exists teams (
  id text primary key,
  name text not null,
  code text,                       -- código da equipe no sistema (ex.: PC-038)
  kind text not null default 'equipe',  -- 'equipe' | 'supervisor'
  supervisor text,
  created_at timestamptz default now()
);
alter table teams add column if not exists supervisor text;
alter table teams add column if not exists code text;
alter table teams add column if not exists kind text not null default 'equipe';

-- CATEGORIAS (tipos de equipamento: Truck, Trailer, Vacuum, ...)
create table if not exists categories (
  id text primary key,
  name text not null,
  kind text not null default 'asset',
  created_at timestamptz default now()
);

-- ITENS DE ESTOQUE (por equipe; team_id nulo = Yard / estoque geral)
create table if not exists items (
  id text primary key,
  team_id text references teams(id) on delete set null,
  name text not null,
  quantity numeric not null default 0,
  unit_price numeric not null default 0,
  min_quantity numeric not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table items add column if not exists team_id text references teams(id) on delete set null;
alter table items add column if not exists min_quantity numeric not null default 0;

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

-- EQUIPAMENTOS (veículos, trailers, máquinas)
create table if not exists assets (
  id text primary key,
  team_id text references teams(id) on delete set null,
  tipo text,                       -- nome da categoria (Truck, Trailer, ...)
  name text not null,
  model text,
  year text,
  plate text,
  vin text,
  supervisor text,
  driver text,                     -- motorista / operador do equipamento
  owner text,
  city text,
  state text,
  notes text,
  status text not null default 'disponivel',  -- 'disponivel' | 'em_uso' | 'manutencao'
  -- Manutenção / troca de óleo
  odometer numeric,                -- milhagem/horas atuais
  oil_interval numeric,            -- intervalo de troca (mesma unidade do odômetro)
  last_oil_odometer numeric,       -- odômetro na última troca
  last_oil_date text,              -- data da última troca (YYYY-MM-DD)
  verizon text,
  bouncie text,
  samsung text,
  e_pass text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table assets add column if not exists status text not null default 'disponivel';
alter table assets add column if not exists odometer numeric;
alter table assets add column if not exists oil_interval numeric;
alter table assets add column if not exists last_oil_odometer numeric;
alter table assets add column if not exists last_oil_date text;
alter table assets add column if not exists driver text;
alter table assets add column if not exists city text;
alter table assets add column if not exists state text;

-- HISTÓRICO DE MANUTENÇÃO POR EQUIPAMENTO (peças, óleo, pneus, revisão)
create table if not exists asset_parts_history (
  id text primary key,
  asset_id text not null references assets(id) on delete cascade,
  item_id text references items(id) on delete set null,
  type text not null default 'peca',   -- 'oleo' | 'pneu' | 'peca' | 'revisao' | 'outro'
  part_name text not null,
  quantity numeric not null default 1,
  odometer numeric,
  cost numeric,
  details jsonb,                       -- campos específicos de cada tipo
  -- Ordem de manutenção em campo aberto
  status text not null default 'concluido',  -- 'em_andamento' | 'concluido'
  work_done text,                      -- texto livre: o que foi feito
  parts_used text,                     -- texto livre: peças usadas (opcional)
  mechanic text,                       -- mecânico / oficina
  finished_date text,                  -- data de conclusão (YYYY-MM-DD)
  date text not null,                  -- data de entrada / do serviço
  notes text,
  created_at timestamptz default now()
);
alter table asset_parts_history add column if not exists type text not null default 'peca';
alter table asset_parts_history add column if not exists odometer numeric;
alter table asset_parts_history add column if not exists cost numeric;
alter table asset_parts_history add column if not exists details jsonb;
alter table asset_parts_history add column if not exists status text not null default 'concluido';
alter table asset_parts_history add column if not exists work_done text;
alter table asset_parts_history add column if not exists parts_used text;
alter table asset_parts_history add column if not exists mechanic text;
alter table asset_parts_history add column if not exists finished_date text;
create index if not exists asset_parts_history_status_idx on asset_parts_history (status);

-- MOVIMENTAÇÕES — trilha de tudo que entra, sai ou muda de equipe
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
  notes text,
  user_name text,
  created_at timestamptz default now()
);
alter table movements add column if not exists notes text;
create index if not exists movements_created_at_idx on movements (created_at desc);
create index if not exists movements_entity_idx on movements (entity_type, entity_id);

-- DOCUMENTOS (PDFs, planilhas e fotos anexados ao sistema)
create table if not exists documents (
  id text primary key,
  name text not null,
  mime text,
  size numeric,
  data text,                    -- conteúdo em base64 (data URL)
  asset_id text references assets(id) on delete cascade,
  team_id text references teams(id) on delete set null,
  category text not null default 'documentos',  -- 'dot'|'registration'|'seguro'|'fotos'|'documentos'
  notes text,
  created_at timestamptz default now()
);
alter table documents add column if not exists category text not null default 'documentos';
create index if not exists documents_asset_idx on documents (asset_id);

-- App interno, usuário único autenticado no próprio app (sem Supabase Auth) — RLS desabilitado
alter table teams                disable row level security;
alter table categories           disable row level security;
alter table items                disable row level security;
alter table invoices             disable row level security;
alter table assets               disable row level security;
alter table asset_parts_history  disable row level security;
alter table movements            disable row level security;
alter table documents            disable row level security;
