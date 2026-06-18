import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Pedido } from '../pedidos/pedido.entity';
import { PedidoDetalle } from '../pedidos/pedido-detalle.entity';
import { Producto } from '../productos/producto.entity';
import PDFDocument from 'pdfkit';

// ─── Colores de marca ─────────────────────────────────────────────────────────
const C_CAFE    = '#7B3F00';
const C_CREMA   = '#F5E6D3';
const C_NARANJA = '#D4730A';
const C_GRIS    = '#888888';
const C_NEGRO   = '#222222';

// ─── Helper: dibuja el encabezado comun ──────────────────────────────────────
function dibujarEncabezado(doc: any, titulo: string) {
  const ahora = new Date();
  const fecha = ahora.toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' });
  const hora  = ahora.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });

  doc.rect(0, 0, doc.page.width, 70).fill(C_CAFE);
  doc.font('Helvetica-Bold').fontSize(22).fillColor('white').text('HANDALZ', 40, 18);
  doc.font('Helvetica').fontSize(10).fillColor(C_CREMA).text('Panaderia y Pasteleria', 40, 44);
  doc.font('Helvetica-Bold').fontSize(14).fillColor('white')
     .text(titulo, 0, 18, { align: 'right', width: doc.page.width - 40 });
  doc.font('Helvetica').fontSize(9).fillColor(C_CREMA)
     .text(`Generado: ${fecha} ${hora}`, 0, 40, { align: 'right', width: doc.page.width - 40 });

  doc.fillColor(C_NEGRO);
  return 90;
}

// ─── Helper: linea separadora ─────────────────────────────────────────────────
function linea(doc: any, y: number, color = '#DDDDDD') {
  doc.moveTo(40, y).lineTo(doc.page.width - 40, y).strokeColor(color).lineWidth(0.5).stroke();
}

// ─── Helper: fila de tabla ────────────────────────────────────────────────────
function filaTabla(
  doc: any,
  y: number,
  cols: { text: string; x: number; width: number; align?: string; bold?: boolean; color?: string }[],
  bgColor?: string,
  rowHeight = 20,
) {
  if (bgColor) {
    doc.rect(40, y, doc.page.width - 80, rowHeight).fill(bgColor);
  }
  for (const col of cols) {
    doc.font(col.bold ? 'Helvetica-Bold' : 'Helvetica')
       .fontSize(9)
       .fillColor(col.color ?? C_NEGRO)
       .text(col.text, col.x, y + 5, { width: col.width, align: (col.align as any) ?? 'left', lineBreak: false });
  }
  doc.fillColor(C_NEGRO).font('Helvetica');
  return y + rowHeight;
}

// ─── Helper: convertir doc a Buffer ──────────────────────────────────────────
function docToBuffer(doc: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

// ─── Helper: calcular rango de fechas segun periodo ──────────────────────────
function calcularRango(periodo?: string, desde?: string, hasta?: string): { fechaDesde: Date | null; fechaHasta: Date | null; etiqueta: string } {
  const ahora = new Date();

  if (periodo === 'hoy') {
    const d = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0);
    const h = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59);
    return { fechaDesde: d, fechaHasta: h, etiqueta: `Hoy: ${ahora.toLocaleDateString('es-BO')}` };
  }

  if (periodo === 'semana') {
    const dia = ahora.getDay();
    const lunes = new Date(ahora);
    lunes.setDate(ahora.getDate() - (dia === 0 ? 6 : dia - 1));
    lunes.setHours(0, 0, 0, 0);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    domingo.setHours(23, 59, 59, 999);
    return {
      fechaDesde: lunes, fechaHasta: domingo,
      etiqueta: `Semana: ${lunes.toLocaleDateString('es-BO')} al ${domingo.toLocaleDateString('es-BO')}`,
    };
  }

  if (periodo === 'mes') {
    const primero = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0);
    const ultimo  = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 23, 59, 59);
    const nombreMes = ahora.toLocaleDateString('es-BO', { month: 'long', year: 'numeric' });
    return { fechaDesde: primero, fechaHasta: ultimo, etiqueta: `Mes: ${nombreMes}` };
  }

  if (periodo === 'rango' && desde && hasta) {
    const d = new Date(desde);
    const h = new Date(hasta);
    h.setHours(23, 59, 59, 999);
    return {
      fechaDesde: d, fechaHasta: h,
      etiqueta: `Rango: ${d.toLocaleDateString('es-BO')} al ${h.toLocaleDateString('es-BO')}`,
    };
  }

  return { fechaDesde: null, fechaHasta: null, etiqueta: 'Todos los registros' };
}

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Pedido)
    private pedidosRepo: Repository<Pedido>,
    @InjectRepository(PedidoDetalle)
    private detalleRepo: Repository<PedidoDetalle>,
    @InjectRepository(Producto)
    private productosRepo: Repository<Producto>,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ESTADISTICAS (JSON)
  // ═══════════════════════════════════════════════════════════════════════════
  async obtenerEstadisticas() {
    const productos = await this.productosRepo.find({ where: { activo: true } });
    const pedidos   = await this.pedidosRepo.find({ where: { activo: true } });

    const totalVentas = pedidos
      .filter(p => p.estado === 'entregado')
      .reduce((s, p) => s + Number(p.total), 0);

    const pedidosPorEstado = {
      pendiente:  pedidos.filter(p => p.estado === 'pendiente').length,
      en_proceso: pedidos.filter(p => p.estado === 'en_proceso').length,
      listo:      pedidos.filter(p => p.estado === 'listo').length,
      entregado:  pedidos.filter(p => p.estado === 'entregado').length,
      cancelado:  pedidos.filter(p => p.estado === 'cancelado').length,
    };

    const productosStockBajo = productos.filter(p => p.stock < 5);

    return {
      totalProductos: productos.length,
      totalPedidos: pedidos.length,
      totalVentas,
      productosAgotados: productos.filter(p => p.stock === 0).length,
      pedidosPorEstado,
      productosStockBajo: productosStockBajo.map(p => ({
        id: p.id, nombre: p.nombre, stock: p.stock,
        categoria: (p as any).categoria?.nombre ?? 'Sin categoria',
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. REPORTE DE VENTAS (PDF)
  // ═══════════════════════════════════════════════════════════════════════════
  async generarReporteVentas(desde?: string, hasta?: string): Promise<Buffer> {
    const where: any = { activo: true };
    if (desde && hasta) {
      const d = new Date(desde);
      const h = new Date(hasta);
      h.setHours(23, 59, 59, 999);
      where.fecha = Between(d, h);
    }

    const pedidos = await this.pedidosRepo.find({
      where,
      relations: { cliente: true },
      order: { fecha: 'DESC' },
    });

    const totalGeneral    = pedidos.filter(p => p.estado === 'entregado').reduce((s, p) => s + Number(p.total), 0);
    const totalDescuentos = pedidos.reduce((s, p) => s + Number(p.descuento), 0);
    const periodoTexto    = desde && hasta
      ? `${new Date(desde).toLocaleDateString('es-BO')} al ${new Date(hasta).toLocaleDateString('es-BO')}`
      : 'Todos los registros';

    const doc = new (PDFDocument as any)({ size: 'A4', layout: 'landscape', margin: 40 });
    const W = doc.page.width;
    let y = dibujarEncabezado(doc, 'Informe de Ventas');

    // ── Bloque titulo informe estilo formal ──
    doc.rect(40, y, W - 80, 28).fill(C_CREMA);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C_CAFE)
       .text('INFORME DE VENTAS', 40, y + 7, { align: 'center', width: W - 80 });
    y += 32;

    doc.rect(40, y, W - 80, 20).fill('#F0E0CC');
    doc.font('Helvetica').fontSize(10).fillColor(C_CAFE)
       .text(`PERIODO: ${periodoTexto.toUpperCase()}`, 40, y + 5, { align: 'center', width: W - 80 });
    y += 28;

    // ── Resumen en dos columnas ──
    const col1x = 40;
    const col2x = W / 2 + 10;
    const colW  = W / 2 - 50;

    // Columna izquierda - estados
    doc.rect(col1x, y, colW, 16).fill(C_CAFE);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('white')
       .text('RESUMEN POR ESTADO', col1x + 8, y + 4, { width: colW });
    y += 16;

    const estados = [
      { label: 'Pendiente',   val: pedidos.filter(p => p.estado === 'pendiente').length,   color: '#E67E22' },
      { label: 'En proceso',  val: pedidos.filter(p => p.estado === 'en_proceso').length,  color: '#2980B9' },
      { label: 'Listo',       val: pedidos.filter(p => p.estado === 'listo').length,       color: '#27AE60' },
      { label: 'Entregado',   val: pedidos.filter(p => p.estado === 'entregado').length,   color: '#1ABC9C' },
      { label: 'Cancelado',   val: pedidos.filter(p => p.estado === 'cancelado').length,   color: '#E74C3C' },
    ];

    const yEstadoInicio = y;
    for (let i = 0; i < estados.length; i++) {
      const e = estados[i];
      const bg = i % 2 === 0 ? C_CREMA : 'white';
      doc.rect(col1x, y, colW, 16).fill(bg);
      doc.font('Helvetica').fontSize(9).fillColor(C_NEGRO).text(e.label, col1x + 8, y + 4, { width: colW / 2 });
      doc.font('Helvetica-Bold').fontSize(9).fillColor(e.color)
         .text(`${e.val} pedido(s)`, col1x + colW / 2, y + 4, { width: colW / 2 - 8, align: 'right' });
      y += 16;
    }

    // Columna derecha - totales
    let yDer = yEstadoInicio;
    doc.rect(col2x, yDer, colW, 16).fill(C_CAFE);
    doc.font('Helvetica-Bold').fontSize(9).fillColor('white')
       .text('TOTALES GENERALES', col2x + 8, yDer + 4, { width: colW });
    yDer += 16;

    const totalesRows = [
      { label: 'Total pedidos registrados', val: String(pedidos.length), color: C_NEGRO, bold: false },
      { label: 'Pedidos entregados',         val: String(pedidos.filter(p => p.estado === 'entregado').length), color: '#1ABC9C', bold: false },
      { label: 'Total descuentos otorgados', val: `Bs. ${totalDescuentos.toFixed(2)}`, color: C_NARANJA, bold: false },
      { label: 'TOTAL VENTAS (entregados)',  val: `Bs. ${totalGeneral.toFixed(2)}`, color: C_CAFE, bold: true },
    ];

    for (let i = 0; i < totalesRows.length; i++) {
      const r = totalesRows[i];
      const bg = i % 2 === 0 ? C_CREMA : 'white';
      doc.rect(col2x, yDer, colW, i === 3 ? 20 : 16).fill(i === 3 ? '#F0E0CC' : bg);
      doc.font(r.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(i === 3 ? 10 : 9).fillColor(C_NEGRO)
         .text(r.label, col2x + 8, yDer + (i === 3 ? 5 : 4), { width: colW * 0.65 });
      doc.font(r.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(i === 3 ? 11 : 9).fillColor(r.color)
         .text(r.val, col2x, yDer + (i === 3 ? 5 : 4), { width: colW - 8, align: 'right' });
      yDer += i === 3 ? 20 : 16;
    }

    y = Math.max(y, yDer) + 12;
    linea(doc, y, C_CAFE);
    y += 10;

    // ── Tabla detalle ──
    doc.rect(40, y, W - 80, 16).fill(C_CAFE);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('white')
       .text('DETALLE DE PEDIDOS', 48, y + 4);
    y += 20;

    const tcols = [
      { text: 'ID',       x: 40,  width: 35,  align: 'center' },
      { text: 'Cliente',  x: 80,  width: 145 },
      { text: 'Entrega',  x: 230, width: 65,  align: 'center' },
      { text: 'Estado',   x: 300, width: 80,  align: 'center' },
      { text: 'Subtotal', x: 385, width: 75,  align: 'right' },
      { text: 'Desc.',    x: 465, width: 45,  align: 'center' },
      { text: 'Total',    x: 515, width: 75,  align: 'right' },
      { text: 'Fecha',    x: 595, width: 65,  align: 'center' },
    ];

    y = filaTabla(doc, y, tcols.map(c => ({ ...c, bold: true, color: 'white' })), C_NARANJA, 20);

    const eColor: Record<string, string> = {
      pendiente: '#E67E22', en_proceso: '#2980B9', listo: '#27AE60',
      entregado: '#1ABC9C', cancelado: '#E74C3C',
    };

    for (let i = 0; i < pedidos.length; i++) {
      if (y > doc.page.height - 60) {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 40 });
        y = 40;
        y = filaTabla(doc, y, tcols.map(c => ({ ...c, bold: true, color: 'white' })), C_NARANJA, 20);
      }
      const p = pedidos[i];
      const bg = i % 2 === 0 ? C_CREMA : undefined;
      const nombre = (p as any).cliente?.nombre ?? p.clienteNombre ?? 'Presencial';
      y = filaTabla(doc, y, [
        { text: String(p.id),                                              x: 40,  width: 35,  align: 'center' },
        { text: nombre,                                                     x: 80,  width: 145 },
        { text: p.tipoEntrega === 'delivery' ? 'Delivery' : 'Presencial',  x: 230, width: 65,  align: 'center' },
        { text: p.estado.replace('_', ' ').toUpperCase(),                  x: 300, width: 80,  align: 'center', color: eColor[p.estado] ?? C_GRIS },
        { text: `Bs. ${Number(p.subtotal).toFixed(2)}`,                    x: 385, width: 75,  align: 'right' },
        { text: p.porcentajeDescuento > 0 ? `${p.porcentajeDescuento}%` : '-', x: 465, width: 45, align: 'center' },
        { text: `Bs. ${Number(p.total).toFixed(2)}`,                       x: 515, width: 75,  align: 'right', bold: true, color: C_CAFE },
        { text: new Date(p.fecha).toLocaleDateString('es-BO'),             x: 595, width: 65,  align: 'center' },
      ], bg);
      linea(doc, y);
    }

    if (pedidos.length === 0) {
      doc.font('Helvetica').fontSize(10).fillColor(C_GRIS)
         .text('No hay pedidos en el periodo seleccionado.', 40, y + 10, { align: 'center', width: W - 80 });
    }

    // Total final al pie
    y += 8;
    doc.rect(40, y, W - 80, 22).fill(C_CREMA);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C_CAFE)
       .text(`TOTAL VENTAS ENTREGADAS: Bs. ${totalGeneral.toFixed(2)}`, 48, y + 6, { width: W - 96, align: 'right' });

    return docToBuffer(doc);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. PRODUCTOS MAS VENDIDOS (PDF) con filtro de periodo
  // ═══════════════════════════════════════════════════════════════════════════
  async generarReporteProductosVendidos(periodo?: string, desde?: string, hasta?: string): Promise<Buffer> {
    const { fechaDesde, fechaHasta, etiqueta } = calcularRango(periodo, desde, hasta);

    const qb = this.detalleRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.producto', 'producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .leftJoin('d.pedido', 'pedido')
      .where('pedido.activo = :activo', { activo: true })
      .andWhere('pedido.estado != :cancelado', { cancelado: 'cancelado' });

    if (fechaDesde && fechaHasta) {
      qb.andWhere('pedido.fecha BETWEEN :desde AND :hasta', {
        desde: fechaDesde,
        hasta: fechaHasta,
      });
    }

    const detalles = await qb.getMany();

    const mapa = new Map<number, { nombre: string; categoria: string; cantidad: number; ingreso: number }>();
    for (const d of detalles) {
      const pid = d.productoId;
      if (!mapa.has(pid)) {
        mapa.set(pid, {
          nombre: d.producto?.nombre ?? `Producto #${pid}`,
          categoria: (d.producto as any)?.categoria?.nombre ?? 'Sin categoria',
          cantidad: 0, ingreso: 0,
        });
      }
      const e = mapa.get(pid)!;
      e.cantidad += d.cantidad;
      e.ingreso  += Number(d.subtotal);
    }

    const ranking = Array.from(mapa.values()).sort((a, b) => b.cantidad - a.cantidad);
    const totalUnidades = ranking.reduce((s, r) => s + r.cantidad, 0);
    const totalIngresos = ranking.reduce((s, r) => s + r.ingreso, 0);

    const doc = new (PDFDocument as any)({ size: 'A4', margin: 40 });
    const W = doc.page.width;
    let y = dibujarEncabezado(doc, 'Productos mas Vendidos');

    // Titulo formal
    doc.rect(40, y, W - 80, 28).fill(C_CREMA);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C_CAFE)
       .text('INFORME DE PRODUCTOS MAS VENDIDOS', 40, y + 7, { align: 'center', width: W - 80 });
    y += 32;

    doc.rect(40, y, W - 80, 20).fill('#F0E0CC');
    doc.font('Helvetica').fontSize(10).fillColor(C_CAFE)
       .text(etiqueta.toUpperCase(), 40, y + 5, { align: 'center', width: W - 80 });
    y += 28;

    // KPIs
    const kw = (W - 80) / 3;
    const kpis = [
      { label: 'Total unidades vendidas', val: String(totalUnidades), color: C_CAFE },
      { label: 'Ingresos generados',      val: `Bs. ${totalIngresos.toFixed(2)}`, color: C_NARANJA },
      { label: 'Productos distintos',     val: String(ranking.length), color: C_CAFE },
    ];
    for (let i = 0; i < kpis.length; i++) {
      const kx = 40 + i * kw;
      doc.rect(kx, y, kw - 8, 52).fill(C_CREMA);
      doc.rect(kx, y, 4, 52).fill(C_CAFE);
      doc.font('Helvetica').fontSize(8).fillColor(C_GRIS).text(kpis[i].label, kx + 12, y + 8, { width: kw - 20 });
      doc.font('Helvetica-Bold').fontSize(20).fillColor(kpis[i].color).text(kpis[i].val, kx + 12, y + 22, { width: kw - 20 });
    }
    y += 62;

    // Tabla ranking
    doc.rect(40, y, W - 80, 18).fill(C_CAFE);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('white')
       .text('RANKING DE PRODUCTOS', 48, y + 4);
    y += 22;

    const rcols = [
      { text: '#',          x: 40,  width: 28,  align: 'center' },
      { text: 'Producto',   x: 72,  width: 185 },
      { text: 'Categoria',  x: 262, width: 110 },
      { text: 'Unidades',   x: 377, width: 65,  align: 'center' },
      { text: '% Ventas',   x: 447, width: 65,  align: 'center' },
      { text: 'Ingresos',   x: 517, width: 78,  align: 'right' },
    ];

    y = filaTabla(doc, y, rcols.map(c => ({ ...c, bold: true, color: 'white' })), C_NARANJA, 20);

    for (let i = 0; i < ranking.length; i++) {
      if (y > doc.page.height - 60) {
        doc.addPage({ size: 'A4', margin: 40 });
        y = 40;
        y = filaTabla(doc, y, rcols.map(c => ({ ...c, bold: true, color: 'white' })), C_NARANJA, 20);
      }
      const r = ranking[i];
      const bg = i < 3 ? '#FFF3E0' : (i % 2 === 0 ? C_CREMA : undefined);
      const pct = totalUnidades > 0 ? ((r.cantidad / totalUnidades) * 100).toFixed(1) : '0.0';
      const medalla = i === 0 ? '1' : i === 1 ? '2' : i === 2 ? '3' : String(i + 1);
      y = filaTabla(doc, y, [
        { text: medalla,              x: 40,  width: 28,  align: 'center', bold: i < 3, color: i < 3 ? C_NARANJA : C_GRIS },
        { text: r.nombre,             x: 72,  width: 185, bold: i < 3 },
        { text: r.categoria,          x: 262, width: 110, color: C_GRIS },
        { text: String(r.cantidad),   x: 377, width: 65,  align: 'center', bold: true },
        { text: `${pct}%`,            x: 447, width: 65,  align: 'center', color: C_NARANJA },
        { text: `Bs. ${r.ingreso.toFixed(2)}`, x: 517, width: 78, align: 'right', bold: i < 3, color: C_CAFE },
      ], bg);
      linea(doc, y);
    }

    if (ranking.length === 0) {
      y += 20;
      doc.rect(40, y, W - 80, 40).fill(C_CREMA);
      doc.font('Helvetica').fontSize(11).fillColor(C_GRIS)
         .text('No hay ventas registradas en el periodo seleccionado.', 40, y + 13, { align: 'center', width: W - 80 });
      y += 50;
    }

    // Nota al pie
    y += 12;
    linea(doc, y, C_CAFE);
    doc.font('Helvetica').fontSize(8).fillColor(C_GRIS)
       .text('Los primeros 3 productos estan resaltados. Solo incluye pedidos activos y no cancelados.', 40, y + 6, { width: W - 80, align: 'center' });

    return docToBuffer(doc);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. REPORTE DE STOCK (PDF)
  // ═══════════════════════════════════════════════════════════════════════════
  async generarReporteStock(): Promise<Buffer> {
    const productos = await this.productosRepo.find({
      where: { activo: true },
      relations: { categoria: true },
      order: { stock: 'ASC' },
    });

    const agotados  = productos.filter(p => p.stock === 0).length;
    const criticos  = productos.filter(p => p.stock > 0 && p.stock < 5).length;
    const normales  = productos.filter(p => p.stock >= 5).length;
    const valorTotal = productos.reduce((s, p) => s + Number(p.precio) * p.stock, 0);

    const doc = new (PDFDocument as any)({ size: 'A4', margin: 40 });
    const W = doc.page.width;
    let y = dibujarEncabezado(doc, 'Estado del Inventario');

    doc.rect(40, y, W - 80, 28).fill(C_CREMA);
    doc.font('Helvetica-Bold').fontSize(13).fillColor(C_CAFE)
       .text('INFORME DE INVENTARIO', 40, y + 7, { align: 'center', width: W - 80 });
    y += 36;

    // KPIs
    const kw = (W - 80) / 4;
    const kpis = [
      { label: 'Agotados',         val: String(agotados),              color: '#E74C3C' },
      { label: 'Stock critico',    val: String(criticos),              color: '#E67E22' },
      { label: 'Stock suficiente', val: String(normales),              color: '#27AE60' },
      { label: 'Valor inventario', val: `Bs. ${valorTotal.toFixed(2)}`, color: C_CAFE },
    ];
    for (let i = 0; i < kpis.length; i++) {
      const kx = 40 + i * kw;
      doc.rect(kx, y, kw - 6, 52).fill(C_CREMA);
      doc.rect(kx, y, 4, 52).fill(kpis[i].color);
      doc.font('Helvetica').fontSize(8).fillColor(C_GRIS).text(kpis[i].label, kx + 12, y + 8, { width: kw - 18 });
      doc.font('Helvetica-Bold').fontSize(i < 3 ? 22 : 14).fillColor(kpis[i].color)
         .text(kpis[i].val, kx + 12, y + 22, { width: kw - 18 });
    }
    y += 62;

    doc.rect(40, y, W - 80, 18).fill(C_CAFE);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('white').text('INVENTARIO DETALLADO', 48, y + 4);
    y += 22;

    const scols = [
      { text: 'Producto',    x: 40,  width: 175 },
      { text: 'Categoria',   x: 220, width: 110 },
      { text: 'Precio',      x: 335, width: 70,  align: 'right' },
      { text: 'Stock',       x: 410, width: 50,  align: 'center' },
      { text: 'Estado',      x: 465, width: 60,  align: 'center' },
      { text: 'Valor total', x: 530, width: 75,  align: 'right' },
    ];

    y = filaTabla(doc, y, scols.map(c => ({ ...c, bold: true, color: 'white' })), C_NARANJA, 20);

    const estadoStock = (s: number) => {
      if (s === 0) return { texto: 'AGOTADO', color: '#E74C3C' };
      if (s < 5)   return { texto: 'CRITICO', color: '#E67E22' };
      if (s < 20)  return { texto: 'BAJO',    color: '#F1C40F' };
      return              { texto: 'OK',      color: '#27AE60' };
    };

    for (let i = 0; i < productos.length; i++) {
      if (y > doc.page.height - 60) { doc.addPage({ size: 'A4', margin: 40 }); y = 40; }
      const p = productos[i];
      const est = estadoStock(p.stock);
      const bg  = i % 2 === 0 ? C_CREMA : undefined;
      y = filaTabla(doc, y, [
        { text: p.nombre,                                          x: 40,  width: 175 },
        { text: (p as any).categoria?.nombre ?? 'Sin categoria',  x: 220, width: 110, color: C_GRIS },
        { text: `Bs. ${Number(p.precio).toFixed(2)}`,             x: 335, width: 70,  align: 'right' },
        { text: String(p.stock),                                   x: 410, width: 50,  align: 'center', bold: true, color: est.color },
        { text: est.texto,                                         x: 465, width: 60,  align: 'center', bold: true, color: est.color },
        { text: `Bs. ${(Number(p.precio) * p.stock).toFixed(2)}`, x: 530, width: 75,  align: 'right',  color: C_CAFE },
      ], bg);
      linea(doc, y);
    }

    y += 10;
    doc.rect(40, y, W - 80, 22).fill(C_CREMA);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C_CAFE)
       .text(`VALOR TOTAL DEL INVENTARIO: Bs. ${valorTotal.toFixed(2)}`, 48, y + 6, { width: W - 96, align: 'right' });

    return docToBuffer(doc);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. BOLETA DE PEDIDO (PDF)
  // ═══════════════════════════════════════════════════════════════════════════
  async generarBoletaPedido(id: number): Promise<Buffer> {
    const pedido = await this.pedidosRepo.findOne({
      where: { id, activo: true },
      relations: { cliente: true, detalles: { producto: true } },
    });
    if (!pedido) throw new NotFoundException(`Pedido #${id} no encontrado`);

    const doc = new (PDFDocument as any)({ size: 'A5', margin: 30 });
    const W = doc.page.width;

    doc.rect(0, 0, W, 60).fill(C_CAFE);
    doc.font('Helvetica-Bold').fontSize(20).fillColor('white').text('HANDALZ', 30, 12);
    doc.font('Helvetica').fontSize(9).fillColor(C_CREMA).text('Panaderia y Pasteleria', 30, 36);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('white')
       .text(`PEDIDO N° ${String(pedido.id).padStart(6, '0')}`, 0, 18, { align: 'right', width: W - 30 });
    doc.font('Helvetica').fontSize(8).fillColor(C_CREMA)
       .text(new Date(pedido.fecha).toLocaleDateString('es-BO'), 0, 34, { align: 'right', width: W - 30 });

    let y = 75;

    const nombreCliente = (pedido as any).cliente?.nombre ?? pedido.clienteNombre ?? 'Presencial';
    const telCliente    = (pedido as any).cliente?.email  ?? pedido.clienteTelefono ?? '-';
    doc.rect(30, y, W - 60, 40).fill(C_CREMA);
    doc.rect(30, y, 4, 40).fill(C_CAFE);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C_CAFE).text('CLIENTE', 42, y + 5);
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C_NEGRO).text(nombreCliente, 42, y + 17);
    doc.font('Helvetica').fontSize(8).fillColor(C_GRIS).text(telCliente, 42, y + 29);

    const estadoColor: Record<string, string> = {
      pendiente: '#E67E22', en_proceso: '#2980B9', listo: '#27AE60',
      entregado: '#1ABC9C', cancelado: '#E74C3C',
    };
    doc.font('Helvetica-Bold').fontSize(10).fillColor(estadoColor[pedido.estado] ?? C_GRIS)
       .text(pedido.estado.replace('_', ' ').toUpperCase(), 0, y + 6, { align: 'right', width: W - 38 });
    doc.font('Helvetica').fontSize(8).fillColor(C_GRIS)
       .text(pedido.tipoEntrega === 'delivery' ? 'DELIVERY' : 'PRESENCIAL', 0, y + 20, { align: 'right', width: W - 38 });

    y += 50;
    linea(doc, y, C_CAFE);
    y += 8;

    const pcols = [
      { text: 'Producto', x: 30, width: 155 },
      { text: 'Cant.',    x: 190, width: 35, align: 'center' },
      { text: 'Precio',   x: 230, width: 70, align: 'right' },
      { text: 'Subtotal', x: 305, width: 75, align: 'right' },
    ];
    y = filaTabla(doc, y, pcols.map(c => ({ ...c, bold: true, color: 'white' })), C_CAFE, 20);

    for (let i = 0; i < pedido.detalles.length; i++) {
      const d = pedido.detalles[i];
      const bg = i % 2 === 0 ? C_CREMA : undefined;
      y = filaTabla(doc, y, [
        { text: d.producto?.nombre ?? `Producto #${d.productoId}`, x: 30,  width: 155 },
        { text: String(d.cantidad),                                 x: 190, width: 35, align: 'center' },
        { text: `Bs. ${Number(d.precioUnitario).toFixed(2)}`,      x: 230, width: 70, align: 'right' },
        { text: `Bs. ${Number(d.subtotal).toFixed(2)}`,            x: 305, width: 75, align: 'right', bold: true },
      ], bg, 18);
      linea(doc, y);
    }

    y += 10;
    linea(doc, y, C_CAFE);
    y += 8;

    doc.font('Helvetica').fontSize(9).fillColor(C_NEGRO)
       .text('Subtotal:', 30, y)
       .text(`Bs. ${Number(pedido.subtotal).toFixed(2)}`, 0, y, { align: 'right', width: W - 30 });
    y += 14;

    if (pedido.porcentajeDescuento > 0) {
      doc.fillColor(C_NARANJA)
         .text(`Descuento (${pedido.porcentajeDescuento}%):`, 30, y)
         .text(`- Bs. ${Number(pedido.descuento).toFixed(2)}`, 0, y, { align: 'right', width: W - 30 });
      y += 14;
    }

    doc.rect(30, y, W - 60, 24).fill(C_CREMA);
    doc.rect(30, y, 4, 24).fill(C_CAFE);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(C_CAFE)
       .text('TOTAL:', 42, y + 6)
       .text(`Bs. ${Number(pedido.total).toFixed(2)}`, 0, y + 6, { align: 'right', width: W - 38 });
    y += 30;

    if (pedido.tipoEntrega === 'delivery' && Number(pedido.anticipo) > 0) {
      doc.font('Helvetica').fontSize(9).fillColor(C_GRIS)
         .text(`Anticipo: Bs. ${Number(pedido.anticipo).toFixed(2)}`, 42, y);
      y += 13;
      doc.font('Helvetica-Bold').fillColor('#E74C3C')
         .text(`Saldo pendiente: Bs. ${(Number(pedido.total) - Number(pedido.anticipo)).toFixed(2)}`, 42, y);
      y += 20;
    }

    y += 10;
    linea(doc, y);
    doc.font('Helvetica').fontSize(9).fillColor(C_NARANJA)
       .text('Gracias por elegirnos. Vuelva pronto.', 30, y + 10, { align: 'center', width: W - 60 });

    return docToBuffer(doc);
  }
}
