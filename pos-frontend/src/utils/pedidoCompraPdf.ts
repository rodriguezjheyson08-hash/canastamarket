import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BoletaConfig } from './boletaConfig';
import { loadAppConfig } from './appConfig';
import { PedidoCompra, User } from '../types';

const toDataUrl = async (src?: string | null): Promise<null | { dataUrl: string; format: 'PNG' | 'JPEG' | 'WEBP' }> => {
  const value = String(src || '').trim();
  if (!value) return null;

  if (value.startsWith('data:image/')) {
    const match = value.match(/^data:image\/(png|jpeg|jpg|webp);base64,/i);
    const raw = String(match?.[1] || '').toLowerCase();
    const format: 'PNG' | 'JPEG' | 'WEBP' = raw === 'png' ? 'PNG' : (raw === 'webp' ? 'WEBP' : 'JPEG');
    return { dataUrl: value, format };
  }

  try {
    const res = await fetch(value, { mode: 'cors' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('No se pudo leer imagen'));
      reader.readAsDataURL(blob);
    });

    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,/i);
    const raw = String(match?.[1] || '').toLowerCase();
    const format: 'PNG' | 'JPEG' | 'WEBP' = raw === 'png' ? 'PNG' : (raw === 'webp' ? 'WEBP' : 'JPEG');
    return { dataUrl, format };
  } catch {
    return null;
  }
};

const safeText = (value: any) => String(value ?? '').trim();

// jsPDF (fonts por defecto) trabaja con WinAnsi/Latin-1. Emojis y algunos caracteres Unicode
// se rompen (sale texto raro). Sanitizamos para evitarlo.
const sanitizePdfText = (value: any) => {
  const raw = safeText(value);
  if (!raw) return '';
  let out = '';
  for (const ch of raw) {
    const code = ch.codePointAt(0) || 0;
    // mantener espacios y caracteres imprimibles Latin-1
    if (code === 9 || code === 10 || code === 13) continue;
    if (code >= 32 && code <= 255) out += ch;
    // omitimos el resto (emoji, etc.)
  }
  return out.replace(/\s+/g, ' ').trim();
};

export const generatePedidoCompraPdf = async (
  pedido: PedidoCompra,
  boleta: BoletaConfig,
  requester?: User | null,
  solicitante?: { dni?: string | null; nombreCompleto?: string | null; email?: string | null } | null
) => {
  const appConfig = loadAppConfig();
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const labelWidth = 86;

  const drawKeyValue = (key: string, value: string, x: number, y: number, lineGap = 6) => {
    const valueX = x + labelWidth;
    const maxValueWidth = pageWidth - marginX - valueX;
    const safeValue = sanitizePdfText(value) || '-';
    const wrappedValue = doc.splitTextToSize(safeValue, Math.max(80, maxValueWidth));
    const lines = Array.isArray(wrappedValue) ? wrappedValue : [String(wrappedValue || '')];
    doc.setFont('helvetica', 'bold');
    doc.text(`${sanitizePdfText(key)}:`, x, y);
    doc.setFont('helvetica', 'normal');
    doc.text(lines, valueX, y);
    const lineHeight = 12;
    return y + Math.max(lineHeight, lines.length * lineHeight) + lineGap;
  };

  const logoSrc = safeText(boleta.logo) || safeText(appConfig.logo);
  const logo = await toDataUrl(logoSrc);
  if (logo) {
    try {
      doc.addImage(logo.dataUrl, logo.format, marginX, 28, 56, 56);
    } catch {
      // ignore logo errors
    }
  }

  const headerLeftX = logo ? marginX + 70 : marginX;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);

  // El nombre visible debe seguir "Configuración -> Nombre de la aplicación".
  // Si cambia, aquí debe reflejarse.
  const appName = sanitizePdfText(appConfig.appName).toUpperCase();
  doc.text(appName || 'ORDEN DE COMPRA', headerLeftX, 48);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  // Empresa (boleta.nombre) es opcional; si trae emoji lo limpiamos.
  const empresaLabel = sanitizePdfText(boleta.nombre) && sanitizePdfText(boleta.nombre) !== appName
    ? `Empresa: ${sanitizePdfText(boleta.nombre)}`
    : '';
  let metaY = 64;
  if (empresaLabel) {
    doc.text(empresaLabel, headerLeftX, metaY);
    metaY += 16;
  }
  if (sanitizePdfText(boleta.ruc)) {
    metaY = drawKeyValue('RUC', sanitizePdfText(boleta.ruc), headerLeftX, metaY, 4);
  }
  if (sanitizePdfText(boleta.telefono)) {
    metaY = drawKeyValue('Tel', sanitizePdfText(boleta.telefono), headerLeftX, metaY, 4);
  }
  if (sanitizePdfText(boleta.direccion)) {
    metaY = drawKeyValue('Dir', sanitizePdfText(boleta.direccion), headerLeftX, metaY, 4);
  }

  const title = 'ORDEN DE COMPRA';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, pageWidth - marginX, 44, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${pedido.id}`, pageWidth - marginX, 60, { align: 'right' });
  doc.text(`Fecha: ${new Date(pedido.fecha).toLocaleString('es-PE')}`, pageWidth - marginX, 74, { align: 'right' });

  let y = 108;
  doc.setDrawColor(210);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 18;

  const prov = pedido.proveedor;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Proveedor', marginX, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y += 16;
  y = drawKeyValue('Razón Social', sanitizePdfText(prov?.razonSocial), marginX, y);
  y = drawKeyValue('RUC', sanitizePdfText(prov?.numeroDocumento), marginX, y);
  y = drawKeyValue('Dirección', sanitizePdfText(prov?.direccion), marginX, y);
  y = drawKeyValue('Contacto', sanitizePdfText(prov?.contactoNombre), marginX, y);
  y = drawKeyValue('Teléfono', sanitizePdfText(prov?.contactoTelefono), marginX, y);
  y = drawKeyValue('Email', sanitizePdfText(prov?.contactoEmail), marginX, y);

  y += 16;

  const items = Array.isArray(pedido.items) ? pedido.items : [];
  const body = items.map((it, idx) => [
    String(idx + 1),
    sanitizePdfText(it.productoNombre) || String(it.productoId),
    String(it.cantidad ?? '')
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Nº', 'Producto', 'Cantidad']],
    body,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [25, 118, 210] },
    columnStyles: {
      0: { cellWidth: 28 },
      2: { cellWidth: 70, halign: 'right' }
    },
    margin: { left: marginX, right: marginX }
  });

  // @ts-ignore - provided by jspdf-autotable
  const finalY: number = (doc as any).lastAutoTable?.finalY || y + 40;
  const totalCantidad = items.reduce((sum, it) => sum + Number(it.cantidad || 0), 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Total items: ${items.length}  |  Total cantidad: ${totalCantidad}`, marginX, finalY + 18);




  const solicitanteNombre = sanitizePdfText(solicitante?.nombreCompleto) || sanitizePdfText(requester?.nombreCompleto);
  const solicitanteDni = sanitizePdfText(solicitante?.dni) || sanitizePdfText((requester as any)?.dni);
  const solicitanteEmail = sanitizePdfText(solicitante?.email) || sanitizePdfText((requester as any)?.email);

  // Bloque solicitante (siempre intenta mostrar al menos el nombre del usuario logueado)
  let solicitanteY = finalY + 42;
  const summaryHeight = solicitanteEmail ? 88 : 70;
  const signatureBlockHeight = summaryHeight;
  if (solicitanteY + signatureBlockHeight > pageHeight - 40) {
    doc.addPage();
    solicitanteY = 60;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Solicitante', marginX, solicitanteY);
  solicitanteY += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  if (solicitanteNombre) {
    solicitanteY = drawKeyValue('Nombre', solicitanteNombre, marginX, solicitanteY, 4);
  }
  if (solicitanteDni) {
    solicitanteY = drawKeyValue('DNI', solicitanteDni, marginX, solicitanteY, 4);
  }
  if (solicitanteEmail) {
    solicitanteY = drawKeyValue('Correo', solicitanteEmail, marginX, solicitanteY, 4);
  }

  doc.save(`orden_compra_${pedido.id}.pdf`);
};
