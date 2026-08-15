import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as store from '../lib/store';
import { supabaseReady } from '../lib/supabase';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [items, setItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [teams, setTeams] = useState([]);
  const [assets, setAssets] = useState([]);
  const [assetHistory, setAssetHistory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useToast();
  const { user } = useAuth();
  const userName = user?.name || 'Sistema';

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsData, invoicesData, teamsData, assetsData, historyData, movementsData, categoriesData, documentsData] =
        await Promise.all([
          store.listItems(),
          store.listInvoices(),
          store.teamsStore.list(),
          store.assetsStore.list(),
          store.assetHistoryStore.list(),
          store.movementsStore.list(),
          store.categoriesStore.list(),
          store.documentsStore.list(),
        ]);
      setItems(itemsData);
      setInvoices(invoicesData);
      setTeams(teamsData);
      setAssets(assetsData);
      setAssetHistory(historyData);
      setMovements(movementsData);
      setCategories(categoriesData);
      setDocuments(documentsData);
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

  // ---------- Categorias (tipos de equipamento) ----------

  async function addCategory(name) {
    const row = await store.categoriesStore.create({ name, kind: 'asset' });
    setCategories((prev) => [...prev, row]);
    notify('Categoria criada', 'success');
    return row;
  }

  async function addCategoriesBulk(names) {
    const existing = new Set(categories.map((c) => c.name.toLowerCase()));
    const fresh = names.filter((n) => !existing.has(n.toLowerCase()));
    const rows = [];
    for (const name of fresh) {
      rows.push(await store.categoriesStore.create({ name, kind: 'asset' }));
    }
    setCategories((prev) => [...prev, ...rows]);
    notify(`${rows.length} categoria(s) adicionada(s)`, 'success');
    return rows;
  }

  async function updateCategory(id, patch) {
    const before = categories.find((c) => c.id === id);
    const updated = await store.categoriesStore.update(id, patch);
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
    // Equipamentos guardam o nome da categoria — renomear precisa acompanhar
    if (before && patch.name && patch.name !== before.name) {
      const affected = assets.filter((a) => a.tipo === before.name);
      await Promise.all(affected.map((a) => store.assetsStore.update(a.id, { tipo: patch.name })));
      setAssets((prev) => prev.map((a) => (a.tipo === before.name ? { ...a, tipo: patch.name } : a)));
    }
    notify('Categoria atualizada', 'success');
    return updated;
  }

  async function removeCategory(id) {
    await store.categoriesStore.remove(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
    notify('Categoria excluída', 'success');
  }

  // ---------- Itens ----------

  async function addItem(fields) {
    const row = await store.createItem(fields);
    setItems((prev) => [...prev, row]);
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

  /**
   * Move uma quantidade de um item entre equipes/yard.
   * Se o destino já tem um item com o mesmo nome, soma nele; senão cria lá.
   */
  async function transferItem({ itemId, quantity, toTeamId, notes }) {
    const source = items.find((i) => i.id === itemId);
    if (!source) return;
    const toId = toTeamId || null;
    if ((source.team_id || null) === toId) {
      notify('Origem e destino são a mesma equipe', 'info');
      return;
    }
    const qty = Math.min(Number(quantity) || 0, Number(source.quantity));
    if (qty <= 0) {
      notify('Quantidade indisponível para transferir', 'error');
      return;
    }

    const updatedSource = await store.updateItemQuantity(itemId, Number(source.quantity) - qty);

    const existing = items.find(
      (i) => i.id !== itemId
        && (i.team_id || null) === toId
        && i.name.trim().toLowerCase() === source.name.trim().toLowerCase()
    );

    let updatedDest;
    if (existing) {
      updatedDest = await store.updateItemQuantity(existing.id, Number(existing.quantity) + qty);
      setItems((prev) => prev.map((i) => {
        if (i.id === itemId) return updatedSource;
        if (i.id === existing.id) return updatedDest;
        return i;
      }));
    } else {
      updatedDest = await store.createItem({
        name: source.name,
        quantity: qty,
        unitPrice: source.unit_price,
        minQuantity: source.min_quantity,
        teamId: toId,
      });
      setItems((prev) => [...prev.map((i) => (i.id === itemId ? updatedSource : i)), updatedDest]);
    }

    const from = teamNameOf(source.team_id) || 'Yard';
    const to = teamNameOf(toId) || 'Yard';
    await logMovement({
      kind: 'transferencia',
      entity_type: 'item',
      entity_id: itemId,
      entity_name: source.name,
      quantity: qty,
      description: `${qty} un. de ${source.name}: ${from} → ${to}`,
      from_value: from,
      to_value: to,
      notes: notes?.trim() || null,
      team_id: toId,
      team_name: teamNameOf(toId),
    });
    notify(`${qty} un. transferida(s) para ${to}`, 'success');
  }

  /** Move um equipamento inteiro para outra equipe/yard. */
  async function transferAsset({ assetId, toTeamId, notes }) {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset) return;
    const toId = toTeamId || null;
    if ((asset.team_id || null) === toId) {
      notify('Origem e destino são a mesma equipe', 'info');
      return;
    }
    const from = teamNameOf(asset.team_id) || 'Yard';
    const to = teamNameOf(toId) || 'Yard';
    const updated = await store.assetsStore.update(assetId, { team_id: toId, updated_at: new Date().toISOString() });
    setAssets((prev) => prev.map((a) => (a.id === assetId ? updated : a)));
    await logMovement({
      kind: 'transferencia',
      entity_type: 'asset',
      entity_id: assetId,
      entity_name: asset.name,
      description: `${asset.name}: ${from} → ${to}`,
      from_value: from,
      to_value: to,
      notes: notes?.trim() || null,
      team_id: toId,
      team_name: teamNameOf(toId),
    });
    notify(`${asset.name} transferido para ${to}`, 'success');
    return updated;
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

  /** Cria o equipamento e, opcionalmente, já grava as manutenções que ele teve. */
  async function addAsset(fields, initialMaintenance = []) {
    const row = await store.assetsStore.create(fields);
    setAssets((prev) => [...prev, row]);

    // `assets` ainda não tem o novo registro neste render — passamos o objeto direto
    for (const entry of initialMaintenance) {
      await addAssetHistoryEntry({ assetId: row.id, ...entry, asset: row, silent: true });
    }

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
      if (patch.status !== undefined && patch.status === 'manutencao' && before.status !== 'manutencao') {
        await logMovement({
          kind: 'manutencao',
          entity_type: 'asset',
          entity_id: id,
          entity_name: updated.name,
          description: `${updated.name} entrou em manutenção`,
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

  /**
   * Registra uma manutenção (óleo, peça, revisão...) no histórico do equipamento.
   * Se for troca de óleo, atualiza a referência usada para prever a próxima.
   */
  async function addAssetHistoryEntry({
    assetId, itemId, partName, quantity, date, notes,
    type = 'peca', odometer = null, cost = null, details = null,
    silent = false, asset: assetOverride = null,
  }) {
    const asset = assetOverride || assets.find((a) => a.id === assetId);

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
      type,
      part_name: partName,
      quantity: quantity || 1,
      odometer: odometer === '' || odometer === null ? null : Number(odometer),
      cost: cost === '' || cost === null ? null : Number(cost),
      details: details && Object.keys(details).length ? details : null,
      date,
      notes: notes || null,
    });
    setAssetHistory((prev) => [row, ...prev]);

    // Troca de óleo redefine a base do cálculo da próxima
    if (type === 'oleo' && row.odometer != null) {
      const patch = { last_oil_odometer: row.odometer, last_oil_date: date };
      if (Number(row.odometer) > Number(asset?.odometer || 0)) patch.odometer = row.odometer;
      const updatedAsset = await store.assetsStore.update(assetId, patch);
      setAssets((prev) => prev.map((a) => (a.id === assetId ? updatedAsset : a)));
    } else if (row.odometer != null && Number(row.odometer) > Number(asset?.odometer || 0)) {
      const updatedAsset = await store.assetsStore.update(assetId, { odometer: row.odometer });
      setAssets((prev) => prev.map((a) => (a.id === assetId ? updatedAsset : a)));
    }

    const typeLabel = type === 'oleo' ? 'Troca de óleo'
      : type === 'revisao' ? 'Revisão'
      : type === 'manutencao' ? 'Manutenção'
      : type === 'pneu' ? 'Pneu'
      : 'Troca de peça';

    await logMovement({
      kind: type === 'peca' ? 'troca_peca' : 'manutencao',
      entity_type: 'asset',
      entity_id: assetId,
      entity_name: asset?.name || 'Equipamento',
      quantity: quantity || 1,
      description: `${typeLabel}: ${partName}${notes ? ` — ${notes}` : ''}`,
      team_id: asset?.team_id || null,
      team_name: teamNameOf(asset?.team_id),
    });

    if (!silent) notify('Manutenção registrada no histórico', 'success');
    return row;
  }

  // ---------- Documentos ----------

  async function addDocument({
    name, mime, size, data, assetId = null, teamId = null, notes = null, category = 'documentos',
  }) {
    const row = await store.documentsStore.create({
      name, mime, size, data, category,
      asset_id: assetId, team_id: teamId, notes,
    });
    setDocuments((prev) => [row, ...prev]);
    notify(`"${name}" enviado`, 'success');
    return row;
  }

  async function removeDocument(id) {
    await store.documentsStore.remove(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    notify('Documento excluído', 'success');
  }

  /** Observação livre numa movimentação já registrada (ex.: motivo da transferência). */
  async function updateMovementNotes(id, notes) {
    const updated = await store.movementsStore.update(id, { notes: notes?.trim() || null });
    setMovements((prev) => prev.map((m) => (m.id === id ? updated : m)));
    notify('Observação salva', 'success');
    return updated;
  }

  /**
   * Importa equipamentos em lote (planilha), pulando os que já existem pelo nome.
   * Categorias da planilha (ex.: "COMPRESSOR") são casadas com as já cadastradas
   * ("Compressor") sem diferenciar maiúsculas; as novas viram categoria de verdade.
   */
  async function importAssets(rows) {
    const existing = new Set(assets.map((a) => (a.name || '').trim().toLowerCase()));
    const byLower = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.name]));
    const newCategories = [];
    const created = [];

    for (const r of rows) {
      const name = (r.name || '').trim();
      if (!name || existing.has(name.toLowerCase())) continue;
      existing.add(name.toLowerCase());

      let tipo = (r.tipo || '').trim() || null;
      if (tipo) {
        const key = tipo.toLowerCase();
        if (byLower.has(key)) {
          tipo = byLower.get(key);
        } else {
          const pretty = tipo.replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
          byLower.set(key, pretty);
          newCategories.push(await store.categoriesStore.create({ name: pretty, kind: 'asset' }));
          tipo = pretty;
        }
      }
      created.push(await store.assetsStore.create({ ...r, name, tipo }));
    }

    if (newCategories.length) setCategories((prev) => [...prev, ...newCategories]);
    if (created.length) setAssets((prev) => [...prev, ...created]);
    return created;
  }

  /** Importa itens de estoque em lote (planilha), somando quando o item já existe na equipe. */
  async function importItems(rows) {
    const created = [];
    const updated = [];
    let pool = [...items];
    for (const r of rows) {
      const name = (r.name || '').trim();
      if (!name) continue;
      const teamId = r.teamId || null;
      const match = pool.find(
        (i) => i.name.trim().toLowerCase() === name.toLowerCase() && (i.team_id || null) === teamId
      );
      if (match) {
        const row = await store.updateItemQuantity(match.id, Number(match.quantity) + Number(r.quantity || 0));
        pool = pool.map((i) => (i.id === row.id ? row : i));
        updated.push(row);
      } else {
        const row = await store.createItem({
          name,
          quantity: Number(r.quantity) || 0,
          unitPrice: Number(r.unitPrice) || 0,
          minQuantity: Number(r.minQuantity) || 0,
          teamId,
        });
        pool = [...pool, row];
        created.push(row);
      }
    }
    setItems(pool);
    return { created, updated };
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
        categories,
        documents,
        loading,
        dbConnected: supabaseReady,
        addItem,
        updateItemFields,
        removeItem,
        addStock,
        removeStock,
        transferItem,
        transferAsset,
        registerInvoice,
        addTeam,
        renameTeam,
        removeTeam,
        addCategory,
        addCategoriesBulk,
        updateCategory,
        removeCategory,
        addAsset,
        updateAsset,
        removeAsset,
        addAssetHistoryEntry,
        addDocument,
        removeDocument,
        updateMovementNotes,
        importAssets,
        importItems,
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
