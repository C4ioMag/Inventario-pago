import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import * as store from '../lib/store';
import { supabaseReady } from '../lib/supabase';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { looksLikeYard, matchTeamId, splitTeamLabel, teamIndex, teamKey } from '../lib/teams';
import { fmtUSD } from '../lib/format';

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
  const [catalog, setCatalog] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useToast();
  const { user } = useAuth();
  const userName = user?.name || 'Sistema';

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        itemsData, invoicesData, teamsData, assetsData, historyData,
        movementsData, categoriesData, documentsData, catalogData, reviewsData,
      ] = await Promise.all([
        store.listItems(),
        store.listInvoices(),
        store.teamsStore.list(),
        store.assetsStore.list(),
        store.assetHistoryStore.list(),
        store.movementsStore.list(),
        store.categoriesStore.list(),
        store.documentsStore.list(),
        store.catalogStore.list(),
        store.reviewsStore.list(),
      ]);
      setItems(itemsData);
      setInvoices(invoicesData);
      setTeams(teamsData);
      setAssets(assetsData);
      setAssetHistory(historyData);
      setMovements(movementsData);
      setCategories(categoriesData);
      setDocuments(documentsData);
      setCatalog(catalogData);
      setReviews(reviewsData);
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
    const payload = typeof fields === 'string' ? { name: fields, kind: 'equipe' } : { kind: 'equipe', ...fields };
    const row = await store.teamsStore.create(payload);
    setTeams((prev) => [...prev, row]);
    notify(`${row.kind === 'supervisor' ? 'Supervisor' : 'Equipe'} "${row.name}" criado`, 'success');
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
    status = 'concluido', workDone = null, partsUsed = null, mechanic = null, finishedDate = null,
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
      status,
      work_done: workDone || null,
      parts_used: partsUsed || null,
      mechanic: mechanic || null,
      finished_date: status === 'concluido' ? (finishedDate || date) : null,
      date,
      notes: notes || null,
    });
    setAssetHistory((prev) => [row, ...prev]);

    // Ordem aberta deixa o equipamento marcado como "em manutenção"
    if (status === 'em_andamento' && asset && asset.status !== 'manutencao') {
      const updatedAsset = await store.assetsStore.update(assetId, { status: 'manutencao' });
      setAssets((prev) => prev.map((a) => (a.id === assetId ? updatedAsset : a)));
    }

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
      description: `${typeLabel}: ${partName}${status === 'em_andamento' ? ' (em andamento)' : ''}${notes ? ` — ${notes}` : ''}`,
      team_id: asset?.team_id || null,
      team_name: teamNameOf(asset?.team_id),
    });

    if (!silent) notify('Manutenção registrada no histórico', 'success');
    return row;
  }

  /**
   * Edita um registro de manutenção já gravado (inclusive o texto livre).
   * Se a situação mudar, o status do equipamento acompanha.
   */
  async function updateAssetHistoryEntry(id, patch) {
    const before = assetHistory.find((h) => h.id === id);
    const updated = await store.assetHistoryStore.update(id, patch);
    const history = assetHistory.map((h) => (h.id === id ? updated : h));
    setAssetHistory(history);

    if (patch.status && before && patch.status !== (before.status || 'concluido')) {
      const asset = assets.find((a) => a.id === updated.asset_id);
      const stillOpen = history.some((h) => h.asset_id === updated.asset_id && h.status === 'em_andamento');
      const nextStatus = stillOpen ? 'manutencao' : 'disponivel';
      if (asset && asset.status !== nextStatus && (stillOpen || asset.status === 'manutencao')) {
        const updatedAsset = await store.assetsStore.update(asset.id, { status: nextStatus });
        setAssets((prev) => prev.map((a) => (a.id === asset.id ? updatedAsset : a)));
      }
    }

    notify('Manutenção atualizada', 'success');
    return updated;
  }

  /**
   * Fecha uma ordem: marca como pronta e, se o equipamento não tiver outra
   * manutenção aberta, devolve o status dele para "disponível".
   */
  async function finishWorkOrder(id, { finishedDate = null, workDone = null, partsUsed = null, cost = null } = {}) {
    const entry = assetHistory.find((h) => h.id === id);
    if (!entry) return;
    const patch = {
      status: 'concluido',
      finished_date: finishedDate || new Date().toISOString().slice(0, 10),
    };
    if (workDone != null) patch.work_done = workDone;
    if (partsUsed != null) patch.parts_used = partsUsed;
    if (cost != null) patch.cost = cost === '' ? null : Number(cost);

    const updated = await store.assetHistoryStore.update(id, patch);
    setAssetHistory((prev) => prev.map((h) => (h.id === id ? updated : h)));

    const asset = assets.find((a) => a.id === entry.asset_id);
    const stillOpen = assetHistory.some(
      (h) => h.asset_id === entry.asset_id && h.id !== id && h.status === 'em_andamento'
    );
    if (asset && !stillOpen && asset.status === 'manutencao') {
      const updatedAsset = await store.assetsStore.update(asset.id, { status: 'disponivel' });
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? updatedAsset : a)));
    }

    await logMovement({
      kind: 'manutencao',
      entity_type: 'asset',
      entity_id: entry.asset_id,
      entity_name: asset?.name || 'Equipamento',
      description: `Manutenção concluída: ${updated.work_done || updated.part_name}`,
      from_value: 'Em manutenção',
      to_value: 'Pronto',
      team_id: asset?.team_id || null,
      team_name: teamNameOf(asset?.team_id),
    });

    notify('Manutenção concluída', 'success');
    return updated;
  }

  /** Reabre uma manutenção concluída (erro de fechamento, serviço voltou). */
  async function reopenWorkOrder(id) {
    const entry = assetHistory.find((h) => h.id === id);
    if (!entry) return;
    const updated = await store.assetHistoryStore.update(id, { status: 'em_andamento', finished_date: null });
    setAssetHistory((prev) => prev.map((h) => (h.id === id ? updated : h)));
    const asset = assets.find((a) => a.id === entry.asset_id);
    if (asset && asset.status !== 'manutencao') {
      const updatedAsset = await store.assetsStore.update(asset.id, { status: 'manutencao' });
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? updatedAsset : a)));
    }
    notify('Manutenção reaberta', 'success');
    return updated;
  }

  async function removeAssetHistoryEntry(id) {
    await store.assetHistoryStore.remove(id);
    setAssetHistory((prev) => prev.filter((h) => h.id !== id));
    notify('Registro de manutenção excluído', 'success');
  }

  /**
   * Devolve o equipamento com esse nome; se não existir, cadastra na hora.
   * É o que permite digitar o veículo direto na tela de manutenção.
   */
  async function ensureAssetByName(name, extra = {}) {
    const clean = String(name || '').trim();
    if (!clean) return null;
    const found = assets.find((a) => (a.name || '').trim().toLowerCase() === clean.toLowerCase());
    if (found) return found;
    const row = await store.assetsStore.create({ name: clean, status: 'disponivel', ...extra });
    setAssets((prev) => [...prev, row]);
    await logMovement({
      kind: 'cadastro',
      entity_type: 'asset',
      entity_id: row.id,
      entity_name: row.name,
      description: 'Equipamento criado a partir da tela de manutenção',
    });
    return row;
  }

  // ---------- Catálogo de itens ----------

  /**
   * O catálogo guarda o item em si (ex.: "Cone de sinalização"), separado do
   * estoque. Itens comprados na rua ficam com `track_stock` desligado: não têm
   * saldo, só o registro de quanto foi entregue a cada equipe.
   */
  async function addCatalogItem(fields) {
    const row = await store.catalogStore.create({
      name: fields.name.trim(),
      unit: fields.unit?.trim() || null,
      default_price: fields.defaultPrice === '' || fields.defaultPrice == null ? null : Number(fields.defaultPrice),
      track_stock: fields.trackStock !== false,
      notes: fields.notes?.trim() || null,
    });
    setCatalog((prev) => [...prev, row]);
    notify(`"${row.name}" salvo no catálogo`, 'success');
    return row;
  }

  async function updateCatalogItem(id, patch) {
    const updated = await store.catalogStore.update(id, patch);
    setCatalog((prev) => prev.map((c) => (c.id === id ? updated : c)));
    notify('Item do catálogo atualizado', 'success');
    return updated;
  }

  async function removeCatalogItem(id) {
    await store.catalogStore.remove(id);
    setCatalog((prev) => prev.filter((c) => c.id !== id));
    notify('Item removido do catálogo', 'success');
  }

  /** Guarda o nome no catálogo se ainda não estiver lá (usado ao criar item). */
  async function ensureCatalogItem(name, extra = {}) {
    const clean = String(name || '').trim();
    if (!clean) return null;
    const found = catalog.find((c) => c.name.trim().toLowerCase() === clean.toLowerCase());
    if (found) return found;
    const row = await store.catalogStore.create({
      name: clean,
      unit: extra.unit || null,
      default_price: extra.defaultPrice ?? null,
      track_stock: extra.trackStock !== false,
      notes: null,
    });
    setCatalog((prev) => [...prev, row]);
    return row;
  }

  /**
   * Entrega direta: material comprado na rua que vai direto para a equipe.
   * Não mexe em saldo — fica registrado quanto cada equipe recebeu.
   */
  async function deliverCatalogItem({ catalogId, name, teamId, quantity, unitPrice, date, notes }) {
    const product = catalog.find((c) => c.id === catalogId);
    const itemName = product?.name || String(name || '').trim();
    if (!itemName) return;
    const qty = Number(quantity) || 0;
    const cost = unitPrice === '' || unitPrice == null ? null : Number(unitPrice);

    const row = await logMovement({
      kind: 'entrega',
      entity_type: 'item',
      entity_id: catalogId || null,
      entity_name: itemName,
      quantity: qty,
      description: `${qty}${product?.unit ? ` ${product.unit}` : ''} de ${itemName} entregue(s) a ${teamNameOf(teamId) || 'Yard'}`
        + (cost != null ? ` · ${fmtUSD(cost * qty)}` : ''),
      to_value: teamNameOf(teamId) || 'Yard',
      team_id: teamId || null,
      team_name: teamNameOf(teamId),
      notes: notes?.trim() || null,
      created_at: date ? new Date(`${date}T12:00:00`).toISOString() : undefined,
    });
    notify(`Entrega registrada para ${teamNameOf(teamId) || 'Yard'}`, 'success');
    return row;
  }

  // ---------- Revisão de transferência ----------

  /**
   * Manda o equipamento/item "para revisão": a transferência só acontece
   * quando alguém confirma que o destino recebeu de verdade.
   */
  async function requestReview({ entityType = 'asset', entityId, quantity = null, toTeamId, notes }) {
    const source = entityType === 'item'
      ? items.find((i) => i.id === entityId)
      : assets.find((a) => a.id === entityId);
    if (!source) return;
    if ((source.team_id || null) === (toTeamId || null)) {
      notify('Origem e destino são a mesma equipe', 'info');
      return;
    }

    const row = await store.reviewsStore.create({
      entity_type: entityType,
      entity_id: entityId,
      entity_name: source.name,
      quantity: entityType === 'item' ? Number(quantity) || 1 : null,
      from_team_id: source.team_id || null,
      from_team_name: teamNameOf(source.team_id) || 'Yard',
      to_team_id: toTeamId || null,
      to_team_name: teamNameOf(toTeamId) || 'Yard',
      status: 'pendente',
      notes: notes?.trim() || null,
      requested_by: userName,
    });
    setReviews((prev) => [row, ...prev]);

    await logMovement({
      kind: 'revisao',
      entity_type: entityType,
      entity_id: entityId,
      entity_name: source.name,
      quantity: row.quantity,
      description: `Enviado para revisão: ${row.from_team_name} → ${row.to_team_name}`,
      from_value: row.from_team_name,
      to_value: row.to_team_name,
      notes: row.notes,
      team_id: source.team_id || null,
      team_name: teamNameOf(source.team_id),
    });

    notify('Enviado para revisão — confirme quando o destino receber', 'success');
    return row;
  }

  /** O destino recebeu: a transferência acontece agora. */
  async function confirmReview(id, reviewNotes) {
    const review = reviews.find((r) => r.id === id);
    if (!review || review.status !== 'pendente') return;

    if (review.entity_type === 'item') {
      await transferItem({
        itemId: review.entity_id,
        quantity: review.quantity || 1,
        toTeamId: review.to_team_id,
        notes: review.notes,
      });
    } else {
      await transferAsset({ assetId: review.entity_id, toTeamId: review.to_team_id, notes: review.notes });
    }

    const updated = await store.reviewsStore.update(id, {
      status: 'confirmado',
      review_notes: reviewNotes?.trim() || null,
      reviewed_by: userName,
      reviewed_at: new Date().toISOString(),
    });
    setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
    notify(`Recebimento confirmado em ${review.to_team_name}`, 'success');
    return updated;
  }

  /** O destino não recebeu: nada é movido e fica o registro do que houve. */
  async function rejectReview(id, reviewNotes) {
    const review = reviews.find((r) => r.id === id);
    if (!review || review.status !== 'pendente') return;
    const updated = await store.reviewsStore.update(id, {
      status: 'nao_recebido',
      review_notes: reviewNotes?.trim() || null,
      reviewed_by: userName,
      reviewed_at: new Date().toISOString(),
    });
    setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));

    await logMovement({
      kind: 'revisao',
      entity_type: review.entity_type,
      entity_id: review.entity_id,
      entity_name: review.entity_name,
      description: `Não recebido em ${review.to_team_name} — segue em ${review.from_team_name}`,
      from_value: review.from_team_name,
      to_value: review.to_team_name,
      notes: updated.review_notes,
      team_id: review.from_team_id,
      team_name: review.from_team_name,
    });

    notify('Marcado como não recebido', 'info');
    return updated;
  }

  /** Volta uma revisão fechada para pendente (fechou por engano). */
  async function reopenReview(id) {
    const updated = await store.reviewsStore.update(id, {
      status: 'pendente',
      reviewed_at: null,
      reviewed_by: null,
    });
    setReviews((prev) => prev.map((r) => (r.id === id ? updated : r)));
    notify('Revisão reaberta', 'success');
    return updated;
  }

  async function removeReview(id) {
    await store.reviewsStore.remove(id);
    setReviews((prev) => prev.filter((r) => r.id !== id));
    notify('Revisão excluída', 'success');
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
  async function importAssets(rows, { updateExisting = true, createTeams = false, linkSupervisors = false } = {}) {
    let teamCreated = [];
    let resolvedTeams = new Map();
    if (createTeams) {
      const labels = rows.filter((r) => !r.team_id && r.team_label).map((r) => r.team_label);
      const out = await ensureTeamsByLabel(labels);
      resolvedTeams = out.resolved;
      teamCreated = out.created;
    }

    // Planilhas onde a coluna Equipe está vazia e quem organiza é o supervisor:
    // ele vira um responsável de verdade e recebe o equipamento.
    let resolvedSupervisors = new Map();
    if (linkSupervisors) {
      const labels = rows
        .filter((r) => !r.team_id && !resolvedTeams.get(r.team_label) && r.supervisor && !looksLikeYard(r.supervisor))
        .map((r) => r.supervisor);
      const out = await ensureTeamsByLabel(labels, { kind: 'supervisor' });
      resolvedSupervisors = out.resolved;
      teamCreated = [...teamCreated, ...out.created];
    }

    const byName = new Map(assets.map((a) => [(a.name || '').trim().toLowerCase(), a]));
    const byLower = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.name]));
    const newCategories = [];
    const created = [];
    const updated = [];
    let skipped = 0;

    for (const raw of rows) {
      const { team_label: teamLabelText, ...r } = raw;
      const name = (r.name || '').trim();
      if (!name) continue;
      if (!r.team_id && teamLabelText) r.team_id = resolvedTeams.get(teamLabelText) || null;
      if (!r.team_id && r.supervisor) r.team_id = resolvedSupervisors.get(r.supervisor.trim()) || null;

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

      const current = byName.get(name.toLowerCase());
      if (!current) {
        const row = await store.assetsStore.create({ ...r, name, tipo });
        byName.set(name.toLowerCase(), row);
        created.push(row);
        continue;
      }

      if (!updateExisting) {
        skipped += 1;
        continue;
      }

      // Só preenche o que a planilha trouxe e o cadastro ainda não tem —
      // importar de novo nunca apaga informação já cadastrada.
      const patch = {};
      for (const [key, value] of Object.entries({ ...r, tipo })) {
        if (key === 'name' || value == null || value === '') continue;
        if (key === 'status' && value === 'disponivel') continue;
        const before = current[key];
        if (before == null || before === '') patch[key] = value;
      }
      if (Object.keys(patch).length === 0) {
        skipped += 1;
        continue;
      }
      const row = await store.assetsStore.update(current.id, { ...patch, updated_at: new Date().toISOString() });
      byName.set(name.toLowerCase(), row);
      updated.push(row);
    }

    if (newCategories.length) setCategories((prev) => [...prev, ...newCategories]);
    if (created.length || updated.length) {
      const patched = new Map(updated.map((a) => [a.id, a]));
      setAssets((prev) => [...prev.map((a) => patched.get(a.id) || a), ...created]);
    }
    return { created, updated, skipped, teamsCreated: teamCreated };
  }

  /**
   * Importa equipes em lote (planilha/PDF).
   * Casa pelo nome ou pelo código — "Equipe Caio", "PC-038" e "Caio · PC-038"
   * são a mesma equipe — e completa o código/supervisor de quem já existe.
   */
  async function importTeams(rows, { defaultKind = 'equipe', createSupervisors = false } = {}) {
    const index = teamIndex(teams);
    const byId = new Map(teams.map((t) => [t.id, t]));
    const created = [];
    const updated = [];
    let skipped = 0;

    for (const r of rows) {
      const name = (r.name || '').trim();
      if (!name) continue;
      const existingId = matchTeamId(name, index) || (r.code ? matchTeamId(r.code, index) : null);

      if (!existingId) {
        const row = await store.teamsStore.create({
          name,
          code: r.code || null,
          kind: r.kind || defaultKind,
          supervisor: r.supervisor || null,
        });
        created.push(row);
        byId.set(row.id, row);
        if (row.name) index.set(teamKey(row.name), row.id);
        if (row.code) index.set(teamKey(row.code), row.id);
        continue;
      }

      const current = byId.get(existingId);
      const patch = {};
      if (r.code && !current?.code) patch.code = r.code;
      if (r.supervisor && !current?.supervisor) patch.supervisor = r.supervisor;
      if (r.kind && r.kind !== (current?.kind || 'equipe')) patch.kind = r.kind;
      if (Object.keys(patch).length === 0) {
        skipped += 1;
        continue;
      }
      const row = await store.teamsStore.update(existingId, patch);
      byId.set(row.id, row);
      updated.push(row);
    }

    if (created.length || updated.length) {
      const patched = new Map(updated.map((t) => [t.id, t]));
      setTeams((prev) => [...prev.map((t) => patched.get(t.id) || t), ...created]);
    }

    // A coluna "Supervisor" da lista de equipes também vira cadastro
    let supervisorsCreated = [];
    if (createSupervisors) {
      const names = rows.map((r) => r.supervisor).filter((n) => n && !looksLikeYard(n));
      const out = await ensureTeamsByLabel(names, { kind: 'supervisor' });
      supervisorsCreated = out.created;
    }

    return { created, updated, skipped, supervisorsCreated };
  }

  /**
   * Garante que existam as equipes citadas numa importação de equipamentos
   * (coluna "Equipe" ou cabeçalhos de grupo do PDF) e devolve rótulo → id.
   */
  async function ensureTeamsByLabel(labels, { kind = 'equipe' } = {}) {
    const index = teamIndex(teams);
    const created = [];
    const resolved = new Map();

    for (const label of labels) {
      const text = String(label || '').trim();
      if (!text || resolved.has(text)) continue;
      const found = matchTeamId(text, index);
      if (found) {
        resolved.set(text, found);
        continue;
      }
      const { name, code } = splitTeamLabel(text);
      const row = await store.teamsStore.create({ name: name || text, code: code || null, kind });
      created.push(row);
      if (row.name) index.set(teamKey(row.name), row.id);
      if (row.code) index.set(teamKey(row.code), row.id);
      resolved.set(text, row.id);
    }

    if (created.length) setTeams((prev) => [...prev, ...created]);
    return { resolved, created };
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
        catalog,
        reviews,
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
        updateAssetHistoryEntry,
        removeAssetHistoryEntry,
        finishWorkOrder,
        reopenWorkOrder,
        ensureAssetByName,
        addCatalogItem,
        updateCatalogItem,
        removeCatalogItem,
        ensureCatalogItem,
        deliverCatalogItem,
        requestReview,
        confirmReview,
        rejectReview,
        reopenReview,
        removeReview,
        addDocument,
        removeDocument,
        updateMovementNotes,
        importAssets,
        importItems,
        importTeams,
        ensureTeamsByLabel,
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
