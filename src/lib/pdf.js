import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtUSD, fmtDate, fmtDateTime } from './format';

const BRAND = 'Power Connect USA';
const INK = [10, 20, 40];
const MUTED = [110, 110, 120];
const ACCENT = [10, 132, 255];

export function exportInventoryPDF(items) {
  const doc = new jsPDF();

  doc.setFontSize(19);
  doc.setTextColor(...INK);
  doc.setFont(undefined, 'bold');
  doc.text(BRAND, 14, 20);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text('Relatório de Estoque', 14, 27);
  doc.setFontSize(9);
  doc.text(`Gerado em ${fmtDateTime()}`, 14, 33);

  const totalValue = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
  const totalUnits = items.reduce((s, i) => s + Number(i.quantity), 0);

  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(`${items.length} itens  ·  ${totalUnits} unidades  ·  Valor total: ${fmtUSD(totalValue)}`, 14, 41);

  autoTable(doc, {
    startY: 47,
    head: [['Item', 'Quantidade', 'Preço/un', 'Valor total']],
    body: items.map((i) => [
      i.name,
      String(i.quantity),
      fmtUSD(i.unit_price),
      fmtUSD(Number(i.quantity) * Number(i.unit_price)),
    ]),
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: ACCENT, textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    foot: [['', '', 'Total', fmtUSD(totalValue)]],
    footStyles: { fillColor: [235, 240, 248], textColor: INK, fontStyle: 'bold' },
  });

  doc.save(`estoque_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportInvoicePDF(invoice) {
  const doc = new jsPDF();

  // Header band
  doc.setFillColor(...ACCENT);
  doc.rect(0, 0, 210, 34, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text(BRAND, 14, 18);
  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  doc.text('Invoice de retirada de estoque', 14, 26);

  doc.setFontSize(22);
  doc.setFont(undefined, 'bold');
  doc.text('INVOICE', 196, 18, { align: 'right' });
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text(`#${invoice.invoice_number}`, 196, 26, { align: 'right' });

  // Meta info
  let y = 48;
  doc.setTextColor(...MUTED);
  doc.setFontSize(9);
  doc.text('DATA', 14, y);
  doc.text('MÁQUINA', 80, y);
  doc.text('VIN', 146, y);

  doc.setTextColor(...INK);
  doc.setFontSize(12);
  doc.text(fmtDate(invoice.created_at), 14, y + 7);
  doc.text(String(invoice.machine), 80, y + 7, { maxWidth: 60 });
  doc.text(String(invoice.vin), 146, y + 7, { maxWidth: 50 });

  y += 20;
  doc.setDrawColor(225, 228, 235);
  doc.line(14, y, 196, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Quantidade', 'Preço unitário', 'Total']],
    body: [[
      invoice.item_name,
      String(invoice.quantity),
      fmtUSD(invoice.unit_price),
      fmtUSD(invoice.total),
    ]],
    styles: { fontSize: 11, cellPadding: 7 },
    headStyles: { fillColor: [30, 34, 42], textColor: 255 },
    foot: [[{ content: 'Total a cobrar', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } }, fmtUSD(invoice.total)]],
    footStyles: { fillColor: [235, 240, 248], textColor: INK, fontStyle: 'bold', fontSize: 12 },
  });

  const footY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text('Obrigado pela preferência.', 14, footY);
  doc.text(`Gerado em ${fmtDateTime()}`, 14, footY + 5);

  doc.save(`invoice_${invoice.invoice_number}.pdf`);
}
