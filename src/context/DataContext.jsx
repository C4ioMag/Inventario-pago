import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as store from '../lib/store';
import { supabaseReady } from '../lib/supabase';
import { useToast } from './ToastContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [items, setItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [teams, setTeams] = useState([]);
  const [assets, setAssets] = useState([]);
  const [assetHistory, setAssetHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useToast();

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsData, invoicesData, teamsData, assetsData, historyData] = await Promise.all([
        store.listItems(),
        store.listInvoices(),
        store.teamsStore.list(),
        store.assetsStore.list(),
        store.assetHistoryStore.list(),
      ]);
      setItems(itemsData);
      setInvoices(invoicesData);
      setTeams(teamsData);
      setAssets(assetsData);
      setAssetHistory(historyData);
    } catch (err) {
      notify(err.message || 'Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // ---------- Teams ----------

  async function addTeam(name) {
    const row = await store.teamsStore.create({ name });
    setTeams((prev) => [...prev, row]);
    notify(`Equipe "${name}" criada`, 'success');
    return row;
  }

  // ---------- Items / Estoque ----------

  async function addItem(name, quantity, unitPrice, teamId = null) {
    const row = await store.createItem({ name, quantity, unitPrice, teamId });
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

  // ---------- Assets (veículos/máquinas) ----------

  async function addAsset(fields) {
    const row = await store.assetsStore.create(fields);
    setAssets((prev) => [...prev, row]);
    notify(`"${fields.name}" adicionado`, 'success');
    return row;
  }

  async function updateAsset(id, patch) {
    const updated = await store.assetsStore.update(id, patch);
    setAssets((prev) => prev.map((a) => (a.id === id ? updated : a)));
    notify('Alterações salvas', 'success');
    return updated;
  }

  async function addAssetHistoryEntry({ assetId, itemId, partName, quantity, date, notes }) {
    if (itemId) {
      const item = items.find((i) => i.id === itemId);
      if (item) {
        const amt = Math.min(Number(quantity) || 1, Number(item.quantity));
        const updated = await store.updateItemQuantity(itemId, Number(item.quantity) - amt);
        setItems((prev) => prev.map((i) => (i.id === itemId ? updated : i)));
      }
    }
    const row = await store.assetHistoryStore.create({
      asset_id: assetId,
      item_id: itemId || null,
      part_name: partName,
      quantity: quantity || 1,
      date,
      notes: notes || null,
    });
    setAssetHistory((prev) => [row, ...prev]);
    notify('Troca registrada no histórico', 'success');
    return row;
  }

  return (
    <DataContext.Provider
      value={{
        items,
        invoices,
        teams,
        assets,
        assetHistory,
        loading,
        dbConnected: supabaseReady,
        addItem,
        addStock,
        removeStock,
        registerInvoice,
        addTeam,
        addAsset,
        updateAsset,
        addAssetHistoryEntry,
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
