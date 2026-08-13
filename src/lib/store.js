import { supabase, supabaseReady } from './supabase';
import { genId } from './format';

const LOCAL_ITEMS_KEY = 'estoque_items';
const LOCAL_INVOICES_KEY = 'estoque_invoices';
const LOCAL_INVOICE_SEQ_KEY = 'estoque_invoice_seq';

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

export async function listItems() {
  if (supabaseReady) {
    const { data, error } = await supabase.from('items').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }
  return readLocal(LOCAL_ITEMS_KEY).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

export async function createItem({ name, quantity, unitPrice }) {
  const row = {
    id: genId(),
    name,
    quantity,
    unit_price: unitPrice,
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

export async function updateItemQuantity(id, newQuantity) {
  const updated_at = new Date().toISOString();
  if (supabaseReady) {
    const { data, error } = await supabase
      .from('items')
      .update({ quantity: newQuantity, updated_at })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const items = readLocal(LOCAL_ITEMS_KEY);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error('Item não encontrado');
  items[idx] = { ...items[idx], quantity: newQuantity, updated_at };
  writeLocal(LOCAL_ITEMS_KEY, items);
  return items[idx];
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
