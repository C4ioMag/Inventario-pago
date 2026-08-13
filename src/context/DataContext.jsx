import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as store from '../lib/store';
import { supabaseReady } from '../lib/supabase';
import { useToast } from './ToastContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [items, setItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useToast();

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsData, invoicesData] = await Promise.all([store.listItems(), store.listInvoices()]);
      setItems(itemsData);
      setInvoices(invoicesData);
    } catch (err) {
      notify(err.message || 'Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  async function addItem(name, quantity, unitPrice) {
    const row = await store.createItem({ name, quantity, unitPrice });
    setItems((prev) => [...prev, row]);
    notify(`"${name}" adicionado ao estoque`, 'success');
    return row;
  }

  async function addStock(id, amount) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const updated = await store.updateItemQuantity(id, Number(item.quantity) + Number(amount));
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    notify(`+${amount} em "${item.name}"`, 'success');
    return updated;
  }

  async function removeStock(id, amount) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const amt = Math.min(Number(amount), Number(item.quantity));
    const updated = await store.updateItemQuantity(id, Number(item.quantity) - amt);
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    return { item, amountRemoved: amt };
  }

  async function registerInvoice({ item, quantity, machine, vin }) {
    const total = Number(item.unit_price) * Number(quantity);
    const invoice = await store.createInvoice({
      itemId: item.id,
      itemName: item.name,
      quantity,
      unitPrice: item.unit_price,
      total,
      machine,
      vin,
    });
    setInvoices((prev) => [invoice, ...prev]);
    return invoice;
  }

  return (
    <DataContext.Provider
      value={{
        items,
        invoices,
        loading,
        dbConnected: supabaseReady,
        addItem,
        addStock,
        removeStock,
        registerInvoice,
        refreshAll,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}
