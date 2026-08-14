import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeftRight, Download, Package, Receipt, Truck } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';
import PageHeader from '../components/PageHeader';
import { exportEquipmentPDF, exportInventoryPDF, exportMovementsPDF } from '../lib/pdf';
import { fmtUSD } from '../lib/format';
import { movementsThisMonth } from '../lib/movements';

export default function Reports() {
  const { items, assets, movements, invoices, teams, registries } = useData();
  const { notify } = useToast();

  const teamName = useMemo(() => {
    const map = new Map(teams.map((t) => [t.id, t.name]));
    return (id) => (id ? map.get(id) || '—' : 'Sem equipe');
  }, [teams]);

  const locationName = useMemo(() => {
    const map = new Map(registries.locations.map((l) => [l.id, l.name]));
    return (id) => (id ? map.get(id) || '—' : '—');
  }, [registries.locations]);

  const stockValue = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
  const invoiceTotal = invoices.reduce((s, i) => s + Number(i.total), 0);
  const byStatus = useMemo(() => {
    const c = { disponivel: 0, em_uso: 0, manutencao: 0 };
    for (const a of assets) c[a.status || 'disponivel'] = (c[a.status || 'disponivel'] || 0) + 1;
    return c;
  }, [assets]);

  function guard(rows, fn) {
    if (rows.length === 0) return notify('Não há dados para esse relatório ainda', 'info');
    fn();
  }

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Exporte os dados do inventário em PDF" />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Summary label="Valor em estoque" value={fmtUSD(stockValue)} />
        <Summary label="Equipamentos disponíveis" value={`${byStatus.disponivel} / ${assets.length}`} />
        <Summary label="Em manutenção" value={byStatus.manutencao} />
        <Summary label="Faturado em invoices" value={fmtUSD(invoiceTotal)} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ReportCard
          icon={Package}
          title="Inventário de itens"
          desc="Todos os itens com quantidade, preço unitário e valor total em estoque."
          count={`${items.length} item(ns)`}
          onExport={() => guard(items, () => exportInventoryPDF(items))}
        />
        <ReportCard
          icon={Truck}
          title="Equipamentos"
          desc="Frota completa com modelo, placa, VIN, equipe, supervisor, status e local."
          count={`${assets.length} equipamento(s)`}
          onExport={() => guard(assets, () => exportEquipmentPDF(assets, { teamName, locationName }))}
        />
        <ReportCard
          icon={ArrowLeftRight}
          title="Movimentações"
          desc="Trilha completa de entradas, saídas, transferências e trocas de peça."
          count={`${movements.length} registro(s) · ${movementsThisMonth(movements).length} neste mês`}
          onExport={() => guard(movements, () => exportMovementsPDF(movements))}
        />
      </div>

      <div className="card mt-5 flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
            <Receipt size={17} />
          </div>
          <div>
            <p className="text-[14px] font-semibold" style={{ color: 'var(--text)' }}>Invoices</p>
            <p className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
              {invoices.length} invoice(s) gerado(s) · {fmtUSD(invoiceTotal)}
            </p>
          </div>
        </div>
        <Link to="/invoices" className="btn-ghost px-3.5 py-2 text-[13px]">Ver invoices</Link>
      </div>
    </div>
  );
}

function Summary({ label, value }) {
  return (
    <div className="card p-4">
      <p className="label-caps">{label}</p>
      <p className="mt-2 text-[20px] font-bold tabular-nums" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>
        {value}
      </p>
    </div>
  );
}

function ReportCard({ icon: Icon, title, desc, count, onExport }) {
  return (
    <div className="card flex flex-col p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
        <Icon size={17} />
      </div>
      <p className="mt-3.5 text-[14.5px] font-semibold" style={{ color: 'var(--text)' }}>{title}</p>
      <p className="mt-1 flex-1 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{desc}</p>
      <p className="mt-3 text-[12.5px]" style={{ color: 'var(--text-tertiary)' }}>{count}</p>
      <button onClick={onExport} className="btn-primary mt-4 flex items-center justify-center gap-2 py-2.5 text-[13px]">
        <Download size={14} /> Exportar PDF
      </button>
    </div>
  );
}
