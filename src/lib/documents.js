import { FileText, Image as ImageIcon, ShieldCheck, FileBadge, ScrollText } from 'lucide-react';

/** Categorias de documento de um equipamento. */
export const DOC_CATEGORIES = [
  { value: 'dot', label: 'DOT', icon: FileBadge, hint: 'Inspeção DOT, cards e certificados' },
  { value: 'registration', label: 'Registration', icon: ScrollText, hint: 'Registro / licenciamento do veículo' },
  { value: 'seguro', label: 'Seguro', icon: ShieldCheck, hint: 'Apólice e cartão do seguro' },
  { value: 'fotos', label: 'Fotos', icon: ImageIcon, hint: 'Fotos do equipamento e de avarias' },
  { value: 'documentos', label: 'Documentos', icon: FileText, hint: 'Notas, manuais e outros arquivos' },
];

export function docCategory(value) {
  return DOC_CATEGORIES.find((c) => c.value === value) || DOC_CATEGORIES[DOC_CATEGORIES.length - 1];
}

export function isImage(doc) {
  return String(doc?.mime || '').startsWith('image/');
}

export function fmtSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
