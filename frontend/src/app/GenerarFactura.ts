import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface FacturaData {
  numero_control: string;
  codigo_generacion: string;
  fecha_emision: string;
  receptor: {
    nombre: string;
    dui?: string;
    correo?: string;
    telefono?: string;
    direccion?: string;
  };
  items: {
    codigo: string | number;
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }[];
  total: number;
  empleado?: string;
}

const EMISOR = {
  nombre:     "FARMACÉUTICOS CATÓLICOS, S.A. DE C.V.",
  nit:        "0614-123456-789-0",
  nrc:        "123456-7",
  actividad:  "Venta de productos farmacéuticos y medicinales",
  direccion:  "5ª Avenida Norte #23, Col. Médica, San Salvador, El Salvador",
  telefono:   "2222-3333",
  correo:     "facturacion@farmacatolicos.com",
};

function numeroALetras(n: number): string {
  const entero = Math.floor(n);
  const centavos = Math.round((n - entero) * 100);
  const unidades = ["","UNO","DOS","TRES","CUATRO","CINCO","SEIS","SIETE","OCHO","NUEVE",
    "DIEZ","ONCE","DOCE","TRECE","CATORCE","QUINCE","DIECISÉIS","DIECISIETE","DIECIOCHO","DIECINUEVE"];
  const decenas = ["","","VEINTE","TREINTA","CUARENTA","CINCUENTA","SESENTA","SETENTA","OCHENTA","NOVENTA"];
  const centenas = ["","CIEN","DOSCIENTOS","TRESCIENTOS","CUATROCIENTOS","QUINIENTOS",
    "SEISCIENTOS","SETECIENTOS","OCHOCIENTOS","NOVECIENTOS"];
  function convertir(num: number): string {
    if (num === 0) return "CERO";
    if (num < 20) return unidades[num];
    if (num < 100) return decenas[Math.floor(num/10)] + (num%10 ? " Y " + unidades[num%10] : "");
    if (num < 1000) return (num === 100 ? "CIEN" : centenas[Math.floor(num/100)] + (num%100 ? " " + convertir(num%100) : ""));
    if (num < 1000000) {
      const miles = Math.floor(num/1000);
      const resto = num % 1000;
      return (miles === 1 ? "MIL" : convertir(miles) + " MIL") + (resto ? " " + convertir(resto) : "");
    }
    return String(num);
  }
  return `${convertir(entero)} ${centavos}/100`;
}

export function generarFacturaPDF(data: FacturaData): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const W = 215.9;
  const azul = [10, 75, 122] as [number,number,number];
  const gris = [245, 247, 250] as [number,number,number];
  const negro = [30, 30, 30] as [number,number,number];
  const blanco: [number,number,number] = [255,255,255];

  // ── Encabezado ──
  doc.setFillColor(...azul);
  doc.rect(0, 0, W, 18, "F");

  // Cruz farmacia (logo simple)
  doc.setFillColor(...blanco);
  doc.rect(8, 3, 12, 12, "F");
  doc.setFillColor(...azul);
  doc.rect(10.5, 5, 7, 2.5, "F");  // horizontal
  doc.rect(13, 3.5, 2.5, 7, "F"); // vertical

  doc.setTextColor(...blanco);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("DOCUMENTO TRIBUTARIO ELECTRÓNICO", W/2, 8, { align:"center" });
  doc.setFontSize(9);
  doc.text("FACTURA", W/2, 13.5, { align:"center" });

  doc.setFontSize(8);
  doc.text("Ver.3", W - 8, 10, { align:"right" });

  // ── Códigos ──
  let y = 24;
  doc.setTextColor(...negro);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("Código de Generación:", 8, y);
  doc.setFont("helvetica", "normal");
  doc.text(data.codigo_generacion, 8, y+4);

  doc.setFont("helvetica", "bold");
  doc.text("Número de Control:", 8, y+9);
  doc.setFont("helvetica", "normal");
  doc.text(data.numero_control, 8, y+13);

  // Derecha
  doc.setFont("helvetica", "bold");
  doc.text("Modelo de Facturación:", W/2 + 10, y);
  doc.setFont("helvetica", "normal");
  doc.text("Modelo Facturación previo", W/2 + 10, y+4);

  doc.setFont("helvetica", "bold");
  doc.text("Tipo de Transmisión:", W/2 + 10, y+9);
  doc.setFont("helvetica", "normal");
  doc.text("Transmisión normal", W/2 + 10, y+13);

  doc.setFont("helvetica", "bold");
  doc.text("Fecha y Hora de Generación:", W/2 + 10, y+18);
  doc.setFont("helvetica", "normal");
  doc.text(data.fecha_emision, W/2 + 10, y+22);

  // Línea separadora
  y = 54;
  doc.setDrawColor(220,220,220);
  doc.line(8, y, W-8, y);

  // ── Emisor / Receptor ──
  y = 59;
  const colW = (W - 24) / 2;
  // Cajas
  doc.setDrawColor(200,200,200);
  doc.setFillColor(...gris);
  doc.roundedRect(8, y, colW, 46, 2, 2, "FD");
  doc.roundedRect(8 + colW + 8, y, colW, 46, 2, 2, "FD");

  // Títulos
  doc.setFontSize(7);
  doc.setTextColor(120,120,120);
  doc.setFont("helvetica","normal");
  doc.text("Emisor", 8 + colW/2, y+5, { align:"center" });
  doc.text("Receptor", 8 + colW + 8 + colW/2, y+5, { align:"center" });

  // Datos emisor
  doc.setTextColor(...negro);
  doc.setFont("helvetica","bold");
  doc.setFontSize(8);
  const emisorLines = doc.splitTextToSize(EMISOR.nombre, colW - 6);
  doc.text(emisorLines, 11, y+10);
  doc.setFont("helvetica","normal");
  doc.setFontSize(7);
  let ey = y + 10 + emisorLines.length * 4;
  doc.text(`NIT: ${EMISOR.nit}`, 11, ey);
  doc.text(`NRC: ${EMISOR.nrc}`, 11, ey+4);
  const actLines = doc.splitTextToSize(`Actividad económica: ${EMISOR.actividad}`, colW-6);
  doc.text(actLines, 11, ey+8);
  const dirLines = doc.splitTextToSize(`Dirección: ${EMISOR.direccion}`, colW-6);
  doc.text(dirLines, 11, ey+8+actLines.length*3.5);
  doc.text(`Número de teléfono: ${EMISOR.telefono}`, 11, ey+8+actLines.length*3.5+dirLines.length*3.5);
  doc.text(`Correo electrónico: ${EMISOR.correo}`, 11, ey+8+actLines.length*3.5+dirLines.length*3.5+4);

  // Datos receptor
  const rx = 8 + colW + 8 + 3;
  doc.setFont("helvetica","bold");
  doc.setFontSize(8);
  doc.text(data.receptor.nombre.toUpperCase(), rx, y+10);
  doc.setFont("helvetica","normal");
  doc.setFontSize(7);
  doc.text("Tipo de Documento de Identificación: DUI", rx, y+15);
  doc.text(`Número de Documento de Identificación: ${data.receptor.dui ?? "—"}`, rx, y+19);
  const recDirLines = doc.splitTextToSize(`Dirección: ${data.receptor.direccion ?? "—"}`, colW-6);
  doc.text(recDirLines, rx, y+23);
  doc.text(`Correo electrónico: ${data.receptor.correo ?? "—"}`, rx, y+23+recDirLines.length*3.5);
  doc.text(`Teléfono: ${data.receptor.telefono ?? "—"}`, rx, y+23+recDirLines.length*3.5+4);

  // ── Tabla de productos ──
  y = 112;
  const total = data.total;
  const subtotalSinIva = total / 1.13;
  const iva = total - subtotalSinIva;

  autoTable(doc, {
    startY: y,
    margin: { left: 8, right: 8 },
    head: [[
      { content:"N°", styles:{halign:"center", cellWidth:8} },
      { content:"Código", styles:{halign:"center", cellWidth:16} },
      { content:"Descripción", styles:{halign:"left"} },
      { content:"Cantidad", styles:{halign:"center", cellWidth:18} },
      { content:"Unidad", styles:{halign:"center", cellWidth:18} },
      { content:"Precio Unitario", styles:{halign:"right", cellWidth:24} },
      { content:"Descuento", styles:{halign:"right", cellWidth:20} },
      { content:"Ventas gravadas", styles:{halign:"right", cellWidth:24} },
    ]],
    body: [
        ...data.items.map((item, idx) => [
        { content: String(idx + 1),                               styles: { halign: "center" as const } },
        { content: String(item.codigo),                           styles: { halign: "center" as const } },
        { content: String(item.descripcion) },
        { content: String(item.cantidad),                         styles: { halign: "center" as const } },
        { content: "UNIDAD",                                      styles: { halign: "center" as const } },
        { content: `$${Number(item.precio_unitario).toFixed(4)}`, styles: { halign: "right"  as const } },
        { content: "$0.0000",                                     styles: { halign: "right"  as const } },
        { content: `$${Number(item.subtotal).toFixed(2)}`,        styles: { halign: "right"  as const } },
        ]),
      
        [
        { content: "SUMA DE VENTAS:", colSpan: 6, styles: { halign: "right" as const, fontStyle: "bold" as const, fillColor: gris } },
        { content: "$0.00",           styles: { halign: "right" as const, fillColor: gris } },
        { content: `$${total.toFixed(2)}`, styles: { halign: "right" as const, fillColor: gris, fontStyle: "bold" as const } },
        ]
      
    ],
    styles: { fontSize:7, cellPadding:2 },
    headStyles: { fillColor:azul, textColor:255, fontSize:7, fontStyle:"bold" },
    alternateRowStyles: { fillColor:[252,252,252] },
  });

  // ── Totales ──
  const finalY = (doc as any).lastAutoTable.finalY + 6;
  const labelX = W - 80;
  const valX = W - 8;

  const rows = [
    ["Suma Total de Operaciones:", `$${total.toFixed(2)}`],
    ["Monto global Desc., Rebajas y otros a ventas no sujetas:", "$0.00"],
    ["Monto global Desc., Rebajas y otros a ventas Exentas:", "$0.00"],
    ["Monto global Desc., Rebajas y otros a ventas Gravadas:", "$0.00"],
    ["Sub-Total:", `$${total.toFixed(2)}`],
    ["IVA Retenido:", "$0.00"],
    ["Retención de Renta:", "$0.00"],
    ["Monto Total de la Operación:", `$${total.toFixed(2)}`],
    ["Total a pagar:", `$${total.toFixed(2)}`],
  ];

  doc.setFontSize(7.5);
  rows.forEach(([label, val], i) => {
    const ry = finalY + i * 5;
    const isBold = label === "Total a pagar:" || label === "Sub-Total:";
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.text(label, labelX, ry, { align:"right" });
    doc.text(val, valX, ry, { align:"right" });
  });

  // ── Pie ──
  const pieY = finalY + rows.length * 5 + 6;
  doc.setFillColor(...negro);
  doc.rect(8, pieY, W-16, 8, "F");
  doc.setTextColor(...blanco);
  doc.setFontSize(7.5);
  doc.setFont("helvetica","bold");
  doc.text(`Valor en letras: ${numeroALetras(total)}`, 11, pieY+5);
  doc.text("Condición de la operación: Contado", W/2 + 20, pieY+5);

  // Apéndices
  const apY = pieY + 14;
  doc.setFillColor(...gris);
  doc.rect(8, apY, W-16, 5, "F");
  doc.setTextColor(...negro);
  doc.setFontSize(7.5);
  doc.setFont("helvetica","bold");
  doc.text("APÉNDICES", 11, apY+3.5);

  doc.setFont("helvetica","normal");
  doc.setFontSize(7);
  doc.text("Datos del vendedor", 11, apY+9);
  doc.text("Datos del documento", W/2+10, apY+9);
  if (data.empleado) {
    doc.setFont("helvetica","bold");
    doc.text(`Nombre: ${data.empleado.toUpperCase()}`, 11, apY+14);
  }
  doc.setFont("helvetica","normal");
  doc.text(`Sello: ${data.codigo_generacion}`, 11, apY+19);

  // Abrir en nueva pestaña para imprimir/descargar
  const fecha = data.fecha_emision.split(" ")[0].replace(/-/g,"");
  doc.save(`Factura_${data.numero_control.split("-").pop()}_${fecha}.pdf`);
}