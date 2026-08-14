import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as store from '../lib/store';
import { supabaseReady } from '../lib/supabase';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

const REGISTRY_STORES = {
  categories: store.categoriesStore,
  suppliers: store.suppliersStore,
  brands: store.brandsStore,
  locations: store.locationsStore,
};

export function DataProvider({ children }) {
  const [items, setItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [teams, setTeams] = useState([]);
  const [assets, setAssets] = useState([]);
  const [assetHistory, setAssetHistory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [registries, setRegistries] = useState({ categories: [], suppliers: [], brands: [], locations: [] });
  const [loading, setLoading] = useState(true);
  const { notify } = useToast();
  const { user } = useAuth();
  const userName = user?.name || 'Sistema';

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsData, invoicesData, teamsData, assetsData, historyData, movementsData,
        categories, suppliers, brands, locations] = await Promise.all([
        store.listItems(),
        store.listInvoices(),
        store.teamsStore.list(),
        store.assetsStore.list(),
        store.assetHistoryStore.list(),
        store.movementsStore.list(),
        store.categoriesStore.list(),
        store.suppliersStore.list(),
        store.brandsStore.list(),
        store.locationsStore.list(),
      ]);
      setItems(itemsData);
      setInvoices(invoicesData);
      setTeams(teamsData);
      setAssets(assetsData);
      setAssetHistory(historyData);
      setMovements(movementsData);
      setRegistries({ categories, suppliers, brands, locations });
    } catch (err) {
      notify(err.message || 'Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  /** Grava uma linha na trilha de movimentações e já reflete no estado local. */
  const logMovement = useCallback(async (fields) => {
    const row = await store.movementsStore.create({ user_name: userName, ...fields });
    setMovements((prev) => [row, ...prev]);
    return row;
  }, [userName]);

  function teamNameOf(teamId) {
    return teamId ? teams.find((t) => t.id === teamId)?.name || null : null;
  }

  // ---------- Equipes ----------

  async function addTeam(fields) {
    const payload = typeof fields === 'string' ? { name: fields } : fields;
    const row = await store.teamsStore.create(payload);
    setTeams((prev) => [...prev, row]);
    notify(`Equipe "${row.name}" criada`, 'success');
    return row;
  }

  async function renameTeam(id, patch) {
    const body = typeof patch === 'string' ? { name: patch } : patch;
    const updated = await store.teamsStore.update(id, body);
    setTeams((prev) => prev.map((t) => (t.id === id ? updated : t)));
    notify('Equipe atualizada', 'success');
    return updated;
  }

  /** Exclui a equipe. Veículos e itens dela voltam para "Sem equipe" em vez de sumirem. */
  async function removeTeam(id) {
    const orphanAssets = assets.filter((a) => a.team_id === id);
    const orphanItems = items.filter((i) => i.team_id === id);

    await Promise.all([
      ...orphanAssets.map((a) => store.assetsStore.update(a.id, { team_id: null })),
      ...orphanItems.map((i) => store.updateItem(i.id, { team_id: null })),
    ]);
    await store.teamsStore.remove(id);

    setAssets((prev) => prev.map((a) => (a.team_id === id ? { ...a, team_id: null } : a)));
    setItems((prev) => prev.map((i) => (i.team_id === id ? { ...i, team_id: null } : i)));
    setTeams((prev) => prev.filter((t) => t.id !== id));

    const moved = orphanAssets.length + orphanItems.length;
    notify(moved ? `Equipe excluída · ${moved} registro(s) movido(s) para "Sem equipe"` : 'Equipe excluída', 'success');
  }

  // ---------- Cadastros (categorias, fornecedores, marcas, locais) ----------

  async function addRegistry(kind, fields) {
    const row = await REGISTRY_STORES[kind].create(fields);
    setRegistries((prev) => ({ ...prev, [kind]: [...prev[kind], row] }));
    notify('Cadastro criado', 'success');
    return row;
  }

  async function updateRegistry(kind, id, patch) {
    const updated = await REGISTRY_STORES[kind].update(id, patch);
    setRegistries((prev) => ({ ...prev, [kind]: prev[kind].map((r) => (r.id === id ? updated : r)) }));
    notify('Cadastro atualizado', 'success');
    return updated;
  }

  async function removeRegistry(kind, id) {
    await REGISTRY_STORES[kind].remove(id);
    setRegistries((prev) => ({ ...prev, [kind]: prev[kind].filter((r) => r.id !== id) }));
    notify('Cadastro excluído', 'success');
  }

  // ---------- Itens ----------

  async function addItem(fields) {
    const row = await store.createItem(fields);
    setItems((prev) => [...prev, row]);
    await logMovement({
      kind: 'cadastro',
      entity_type: 'item',
      entity_id: row.id,
      entity_name: row.name,
      quantity: row.quantity,
      description: `Item cadastrado com ${row.quantity} unidade(s)`,
      team_id: row.team_id,
      team_name: teamNameOf(row.team_id),
    });
    notify(`"${row.name}" adicionado ao estoque`, 'success');
    return row;
  }

  async function updateItemFields(id, patch) {
    const before = items.find((i) => i.id === id);
    const updated = await store.updateItem(id, patch);
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    if (before && patch.team_id !== undefined && patch.team_id !== before.team_id) {
      await logMovement({
        kind: 'transferencia',
        entity_type: 'item',
        entity_id: id,
        entity_name: updated.name,
        description: `Transferido de ${teamNameOf(before.team_id) || 'Geral'} para ${teamNameOf(updated.team_id) || 'Geral'}`,
        from_value: teamNameOf(before.team_id) || 'Geral',
        to_value: teamNameOf(updated.team_id) || 'Geral',
        team_id: updated.team_id,
        team_name: teamNameOf(updated.team_id),
      });
    }
    notify('Item atualizado', 'success');
    return updated;
  }

  async function removeItem(id) {
    const item = items.find((i) => i.id === id);
    await store.deleteItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (item) {
      await logMovement({
        kind: 'exclusao',
        entity_type: 'item',
        entity_id: id,
        entity_name: item.name,
        description: 'Item excluído do estoque',
        team_id: item.team_id,
        team_name: teamNameOf(item.team_id),
      });
    }
    notify('Item excluído', 'success');
  }

  async function addStock(id, amount, note) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const updated = await store.updateItemQuantity(id, Number(item.quantity) + Number(amount));
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    await logMovement({
      kind: 'entrada',
      entity_type: 'item',
      entity_id: id,
      entity_name: item.name,
      quantity: Number(amount),
      description: note || `Entrada de ${amount} unidade(s) — ${item.name}`,
      team_id: item.team_id,
      team_name: teamNameOf(item.team_id),
    });
    notify(`+${amount} em "${item.name}"`, 'success');
    return updated;
  }

  async function removeStock(id, amount, note) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const amt = Math.min(Number(amount), Number(item.quantity));
    const updated = await store.updateItemQuantity(id, Number(item.quantity) - amt);
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    await logMovement({
      kind: 'saida',
      entity_type: 'item',
      entity_id: id,
      entity_name: item.name,
      quantity: amt,
      description: note || `Saída de ${amt} unidade(s) — ${item.name}`,
      team_id: item.team_id,
      team_name: teamNameOf(item.team_id),
    });
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

  // ---------- Assets ----------

  async function addAsset(fields) {
    const row = await store.assetsStore.create(fields);
    setAssets((prev) => [...prev, row]);
    await logMovement({
      kind: 'cadastro',
      entity_type: 'asset',
      entity_id: row.id,
      entity_name: row.name,
      description: `${row.tipo || 'Equipamento'} cadastrado`,
      team_id: row.team_id,
      team_name: teamNameOf(row.team_id),
    });
    notify(`"${fields.name}" adicionado`, 'success');
    return row;
  }

  async function updateAsset(id, patch) {
    const before = assets.find((a) => a.id === id);
    const updated = await store.assetsStore.update(id, { ...patch, updated_at: new Date().toISOString() });
    setAssets((prev) => prev.map((a) => (a.id === id ? updated : a)));

    if (before) {
      if (patch.team_id !== undefined && patch.team_id !== before.team_id) {
        await logMovement({
          kind: 'transferencia',
          entity_type: 'asset',
          entity_id: id,
          entity_name: updated.name,
          description: `Transferido de ${teamNameOf(before.team_id) || 'Sem equipe'} para ${teamNameOf(updated.team_id) || 'Sem equipe'}`,
          from_value: teamNameOf(before.team_id) || 'Sem equipe',
          to_value: teamNameOf(updated.team_id) || 'Sem equipe',
          team_id: updated.team_id,
          team_name: teamNameOf(updated.team_id),
        });
      }
      if (patch.status !== undefined && patch.status !== before.status) {
        await logMovement({
          kind: patch.status === 'manutencao' ? 'manutencao' : 'edicao',
          entity_type: 'asset',
          entity_id: id,
          entity_name: updated.name,
          description: `Status alterado de ${before.status} para ${updated.status}`,
          from_value: before.status,
          to_value: updated.status,
          team_id: updated.team_id,
          team_name: teamNameOf(updated.team_id),
        });
      }
    }
    notify('Alterações salvas', 'success');
    return updated;
  }

  async function removeAsset(id) {
    const asset = assets.find((a) => a.id === id);
    const related = assetHistory.filter((h) => h.asset_id === id);
    await Promise.all(related.map((h) => store.assetHistoryStore.remove(h.id)));
    await store.assetsStore.remove(id);
    setAssetHistory((prev) => prev.filter((h) => h.asset_id !== id));
    setAssets((prev) => prev.filter((a) => a.id !== id));
    if (asset) {
      await logMovement({
        kind: 'exclusao',
        entity_type: 'asset',
        entity_id: id,
        entity_name: asset.name,
        description: 'Equipamento excluído',
        team_id: asset.team_id,
        team_name: teamNameOf(asset.team_id),
      });
    }
    notify('Equipamento excluído', 'success');
  }

  async function addAssetHistoryEntry({ assetId, itemId, partName, quantity, date, notes }) {
    const asset = assets.find((a) => a.id === assetId);
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
    await logMovement({
      kind: 'troca_peca',
      entity_type: 'asset',
      entity_id: assetId,
      entity_name: asset?.name || 'Equipamento',
      quantity: quantity || 1,
      description: `Troca de peça: ${partName}${notes ? ` — ${notes}` : ''}`,
      team_id: asset?.team_id || null,
      team_name: teamNameOf(asset?.team_id),
    });
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
        movements,
        registries,
        loading,
        dbConnected: supabaseReady,
        addItem,
        updateItemFields,
        removeItem,
        addStock,
        removeStock,
        registerInvoice,
        addTeam,
        renameTeam,
        removeTeam,
        addRegistry,
        updateRegistry,
        removeRegistry,
        addAsset,
        updateAsset,
        removeAsset,
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
