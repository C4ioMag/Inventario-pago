import { supabase, supabaseReady } from './supabase';
import { genId } from './format';

const LOCAL_ITEMS_KEY = 'estoque_items';
const LOCAL_INVOICES_KEY = 'estoque_invoices';
const LOCAL_INVOICE_SEQ_KEY = 'estoque_invoice_seq';
const LOCAL_TEAMS_KEY = 'estoque_teams';
const LOCAL_ASSETS_KEY = 'estoque_assets';
const LOCAL_ASSET_HISTORY_KEY = 'estoque_asset_history';
const LOCAL_MOVEMENTS_KEY = 'estoque_movements';
const LOCAL_CATEGORIES_KEY = 'estoque_categories';

function readLocal(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function nextLocalInvoiceNumber() {
  const current = Number(localStorage.getItem(LOCAL_INVOICE_SEQ_KEY)) || 1000;
  const next = current + 1;
  localStorage.setItem(LOCAL_INVOICE_SEQ_KEY, String(next));
  return next;
}

/** Generic CRUD for simple tables (teams, assets, asset_parts_history) shared between Supabase and localStorage. */
function makeCrud(table, localKey, { orderAsc = true } = {}) {
  async function list() {
    if (supabaseReady) {
      const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: orderAsc });
      if (error) throw error;
      return data;
    }
    const rows = readLocal(localKey);
    rows.sort((a, b) => (orderAsc ? 1 : -1) * (new Date(a.created_at) - new Date(b.created_at)));
    return rows;
  }

  async function create(fields) {
    const row = { id: genId(), created_at: new Date().toISOString(), ...fields };
    if (supabaseReady) {
      const { data, error } = await supabase.from(table).insert(row).select().single();
      if (error) throw error;
      return data;
    }
    const rows = readLocal(localKey);
    rows.push(row);
    writeLocal(localKey, rows);
    return row;
  }

  async function update(id, patch) {
    if (supabaseReady) {
      const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const rows = readLocal(localKey);
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Registro não encontrado');
    rows[idx] = { ...rows[idx], ...patch };
    writeLocal(localKey, rows);
    return rows[idx];
  }

  async function remove(id) {
    if (supabaseReady) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return;
    }
    writeLocal(localKey, readLocal(localKey).filter((r) => r.id !== id));
  }

  return { list, create, update, remove };
}

export const teamsStore = makeCrud('teams', LOCAL_TEAMS_KEY);
export const assetsStore = makeCrud('assets', LOCAL_ASSETS_KEY);
export const assetHistoryStore = makeCrud('asset_parts_history', LOCAL_ASSET_HISTORY_KEY, { orderAsc: false });
export const movementsStore = makeCrud('movements', LOCAL_MOVEMENTS_KEY, { orderAsc: false });
export const categoriesStore = makeCrud('categories', LOCAL_CATEGORIES_KEY);

export async function listItems() {
  if (supabaseReady) {
    const { data, error } = await supabase.from('items').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }
  return readLocal(LOCAL_ITEMS_KEY).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

export async function createItem({ name, quantity, unitPrice, teamId = null, minQuantity = 0 }) {
  const row = {
    id: genId(),
    team_id: teamId,
    name,
    quantity,
    unit_price: unitPrice,
    min_quantity: minQuantity,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (supabaseReady) {
    const { data, error } = await supabase.from('items').insert(row).select().single();
    if (error) throw error;
    return data;
  }
  const items = readLocal(LOCAL_ITEMS_KEY);
  items.push(row);
  writeLocal(LOCAL_ITEMS_KEY, items);
  return row;
}

export async function updateItem(id, patch) {
  const body = { ...patch, updated_at: new Date().toISOString() };
  if (supabaseReady) {
    const { data, error } = await supabase.from('items').update(body).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  const items = readLocal(LOCAL_ITEMS_KEY);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error('Item não encontrado');
  items[idx] = { ...items[idx], ...body };
  writeLocal(LOCAL_ITEMS_KEY, items);
  return items[idx];
}

export function updateItemQuantity(id, newQuantity) {
  return updateItem(id, { quantity: newQuantity });
}

export async function deleteItem(id) {
  if (supabaseReady) {
    const { error } = await supabase.from('items').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  writeLocal(LOCAL_ITEMS_KEY, readLocal(LOCAL_ITEMS_KEY).filter((i) => i.id !== id));
}

export async function listInvoices() {
  if (supabaseReady) {
    const { data, error } = await supabase.from('invoices').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
  return readLocal(LOCAL_INVOICES_KEY).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function createInvoice({ itemId, itemName, quantity, unitPrice, total, machine, vin }) {
  if (supabaseReady) {
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        id: genId(),
        item_id: itemId,
        item_name: itemName,
        quantity,
        unit_price: unitPrice,
        total,
        machine,
        vin,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const row = {
    id: genId(),
    invoice_number: nextLocalInvoiceNumber(),
    item_id: itemId,
    item_name: itemName,
    quantity,
    unit_price: unitPrice,
    total,
    machine,
    vin,
    created_at: new Date().toISOString(),
  };
  const invoices = readLocal(LOCAL_INVOICES_KEY);
  invoices.unshift(row);
  writeLocal(LOCAL_INVOICES_KEY, invoices);
  return row;
}
