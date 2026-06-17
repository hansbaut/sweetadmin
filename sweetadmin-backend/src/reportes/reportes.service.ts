import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Pedido } from '../pedidos/pedido.entity';
import { PedidoDetalle } from '../pedidos/pedido-detalle.entity';
import { Producto } from '../productos/producto.entity';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfMake = require('pdfmake/build/pdfmake');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const vfsFonts = require('pdfmake/build/vfs_fonts');
pdfMake.addVirtualFileSystem(vfsFonts);

// ─── Constantes de marca ──────────────────────────────────────────────────────
const MARCA = 'HANDALZ';
const SUBTITULO = 'Panaderia y Pasteleria';
const COLOR_PRIMARIO = '#7B3F00';   // marron cafe
const COLOR_SECUNDARIO = '#F5E6D3'; // crema suave
const COLOR_ACENTO = '#D4730A';     // naranja dorado

// ─── Helper: genera el encabezado comun para todos los reportes ───────────────
function encabezado(titulo: string, subtituloReporte: string) {
  const ahora = new Date();
  const fechaStr = ahora.toLocaleDateString('es-BO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  const horaStr = ahora.toLocaleTimeString('es-BO', {
    hour: '2-digit', minute: '2-digit',
  });

  return [
    {
      columns: [
        {
          stack: [
            { text: MARCA, fontSize: 26, bold: true, color: COLOR_PRIMARIO },
            { text: SUBTITULO, fontSize: 11, color: COLOR_ACENTO, margin: [0, 2, 0, 0] },
          ],
        },
        {
          stack: [
            { text: titulo, fontSize: 16, bold: true, color: COLOR_PRIMARIO, alignment: 'right' },
            { text: `Generado: ${fechaStr} ${horaStr}`, fontSize: 9, color: '#888888', alignment: 'right', margin: [0, 4, 0, 0] },
          ],
        },
      ],
      margin: [0, 0, 0, 4],
    },
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: COLOR_PRIMARIO }],
      margin: [0, 0, 0, 6],
    },
    {
      text: subtituloReporte,
      fontSize: 10,
      color: '#555555',
      italics: true,
      margin: [0, 0, 0, 16],
    },
  ];
}

// ─── Helper: pie de pagina comun ──────────────────────────────────────────────
function piePagina(currentPage: number, pageCount: number) {
  return {
    columns: [
      { text: `${MARCA} - ${SUBTITULO}`, fontSize: 8, color: '#aaaaaa' },
      {
        text: `Pagina ${currentPage} de ${pageCount}`,
        alignment: 'right',
        fontSize: 8,
        color: '#aaaaaa',
      },
    ],
    margin: [40, 0],
  };
}

// ─── Helper: convierte un Buffer de pdfmake a Promise<Buffer> ─────────────────
function buildPdf(docDefinition: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = pdfMake.createPdf(docDefinition);
      doc.getBuffer((buffer: Buffer) => resolve(buffer));
    } catch (err) {
      reject(err);
    }
  });
}

// ─── Helper: etiqueta de estado con color ─────────────────────────────────────
function colorEstado(estado: string): string {
  const mapa: Record<string, string> = {
    pendiente: '#E67E22',
    en_proceso: '#2980B9',
    listo: '#27AE60',
    entregado: '#1ABC9C',
    cancelado: '#E74C3C',
  };
  return mapa[estado] ?? '#888888';
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
  // 1. ESTADISTICAS (JSON - para el dashboard)
  // ═══════════════════════════════════════════════════════════════════════════
  async obtenerEstadisticas() {
    const productos = await this.productosRepo.find({ where: { activo: true } });
    const pedidos = await this.pedidosRepo.find({ where: { activo: true } });

    const totalVentas = pedidos
      .filter(p => p.estado === 'entregado')
      .reduce((sum, p) => sum + Number(p.total), 0);

    const pedidosPorEstado = {
      pendiente:  pedidos.filter(p => p.estado === 'pendiente').length,
      en_proceso: pedidos.filter(p => p.estado === 'en_proceso').length,
      listo:      pedidos.filter(p => p.estado === 'listo').length,
      entregado:  pedidos.filter(p => p.estado === 'entregado').length,
      cancelado:  pedidos.filter(p => p.estado === 'cancelado').length,
    };

    const productosStockBajo = productos.filter(p => p.stock < 5);
    const productosAgotados  = productos.filter(p => p.stock === 0);

    return {
      totalProductos: productos.length,
      totalPedidos: pedidos.length,
      totalVentas,
      pedidosPorEstado,
      productosStockBajo: productosStockBajo.map(p => ({
        id: p.id,
        nombre: p.nombre,
        stock: p.stock,
        categoria: p.categoria?.nombre ?? 'Sin categoria',
      })),
      productosAgotados: productosAgotados.length,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. REPORTE DE VENTAS (PDF) con filtro por rango de fechas
  // ═══════════════════════════════════════════════════════════════════════════
  async generarReporteVentas(desde?: string, hasta?: string): Promise<Buffer> {
    const whereBase: any = { activo: true };

    if (desde && hasta) {
      const fechaDesde = new Date(desde);
      const fechaHasta = new Date(hasta);
      fechaHasta.setHours(23, 59, 59, 999);
      whereBase.fecha = Between(fechaDesde, fechaHasta);
    }

    const pedidos = await this.pedidosRepo.find({
      where: whereBase,
      relations: { cliente: true },
      order: { fecha: 'DESC' },
    });

    const soloEntregados = pedidos.filter(p => p.estado === 'entregado');
    const totalGeneral   = soloEntregados.reduce((s, p) => s + Number(p.total), 0);
    const totalDescuentos = pedidos.reduce((s, p) => s + Number(p.descuento), 0);

    const periodoTexto = desde && hasta
      ? `Periodo: ${new Date(desde).toLocaleDateString('es-BO')} al ${new Date(hasta).toLocaleDateString('es-BO')}`
      : 'Periodo: todos los registros';

    // Filas de la tabla
    const filas: any[] =
      pedidos.length > 0
        ? pedidos.map(p => [
            { text: String(p.id), alignment: 'center' },
            p.cliente?.nombre ?? p.clienteNombre ?? 'Presencial',
            { text: p.tipoEntrega === 'delivery' ? 'Delivery' : 'Presencial', alignment: 'center' },
            {
              text: p.estado.replace('_', ' ').toUpperCase(),
              color: colorEstado(p.estado),
              bold: true,
              fontSize: 9,
              alignment: 'center',
            },
            {
              text: `Bs. ${Number(p.subtotal).toFixed(2)}`,
              alignment: 'right',
            },
            {
              text: p.porcentajeDescuento > 0 ? `${p.porcentajeDescuento}%` : '-',
              alignment: 'center',
              color: p.porcentajeDescuento > 0 ? COLOR_ACENTO : '#888888',
            },
            {
              text: `Bs. ${Number(p.total).toFixed(2)}`,
              bold: true,
              alignment: 'right',
              color: COLOR_PRIMARIO,
            },
            {
              text: new Date(p.fecha).toLocaleDateString('es-BO'),
              alignment: 'center',
              fontSize: 9,
            },
          ])
        : [
            [
              {
                text: 'No hay pedidos en el periodo seleccionado',
                colSpan: 8,
                alignment: 'center',
                color: '#888888',
                italics: true,
              },
              '', '', '', '', '', '', '',
            ],
          ];

    const encab = encabezado('Reporte de Ventas', periodoTexto);

    // Resumen por estado
    const resumenEstados = [
      ['Estado', 'Cantidad', 'Total (Bs.)'],
      ...['pendiente', 'en_proceso', 'listo', 'entregado', 'cancelado'].map(est => [
        { text: est.replace('_', ' ').toUpperCase(), color: colorEstado(est), bold: true },
        { text: String(pedidos.filter(p => p.estado === est).length), alignment: 'center' },
        {
          text: `Bs. ${pedidos.filter(p => p.estado === est).reduce((s, p) => s + Number(p.total), 0).toFixed(2)}`,
          alignment: 'right',
        },
      ]),
    ];

    const docDefinition: any = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [40, 50, 40, 50],
      footer: piePagina,
      content: [
        ...encab,

        // Resumen estadistico
        {
          columns: [
            {
              stack: [
                { text: 'RESUMEN DEL PERIODO', bold: true, fontSize: 11, color: COLOR_PRIMARIO, margin: [0, 0, 0, 6] },
                {
                  table: {
                    widths: [110, 80, 110],
                    body: resumenEstados,
                  },
                  layout: {
                    fillColor: (i: number) => i === 0 ? COLOR_PRIMARIO : (i % 2 === 0 ? COLOR_SECUNDARIO : null),
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0,
                    hLineColor: () => '#dddddd',
                  },
                },
              ],
              width: '40%',
            },
            { width: '5%', text: '' },
            {
              stack: [
                { text: 'TOTALES GENERALES', bold: true, fontSize: 11, color: COLOR_PRIMARIO, margin: [0, 0, 0, 6] },
                {
                  table: {
                    widths: ['*', 120],
                    body: [
                      [
                        { text: 'Total pedidos registrados', fontSize: 10 },
                        { text: String(pedidos.length), bold: true, alignment: 'right', fontSize: 10 },
                      ],
                      [
                        { text: 'Total en descuentos otorgados', fontSize: 10 },
                        { text: `Bs. ${totalDescuentos.toFixed(2)}`, color: COLOR_ACENTO, bold: true, alignment: 'right', fontSize: 10 },
                      ],
                      [
                        { text: 'Total ventas (solo entregados)', fontSize: 11, bold: true, color: COLOR_PRIMARIO },
                        { text: `Bs. ${totalGeneral.toFixed(2)}`, bold: true, fontSize: 14, color: COLOR_PRIMARIO, alignment: 'right' },
                      ],
                    ],
                  },
                  layout: {
                    fillColor: (i: number) => i % 2 === 0 ? COLOR_SECUNDARIO : null,
                    hLineWidth: () => 0.5,
                    vLineWidth: () => 0,
                    hLineColor: () => '#dddddd',
                  },
                },
              ],
              width: '55%',
            },
          ],
          margin: [0, 0, 0, 20],
        },

        // Tabla detalle
        { text: 'DETALLE DE PEDIDOS', bold: true, fontSize: 11, color: COLOR_PRIMARIO, margin: [0, 0, 0, 6] },
        {
          table: {
            headerRows: 1,
            widths: [30, '*', 60, 70, 65, 45, 70, 60],
            body: [
              [
                { text: 'ID', bold: true, color: 'white', fillColor: COLOR_PRIMARIO, fontSize: 9, alignment: 'center' },
                { text: 'Cliente', bold: true, color: 'white', fillColor: COLOR_PRIMARIO, fontSize: 9 },
                { text: 'Entrega', bold: true, color: 'white', fillColor: COLOR_PRIMARIO, fontSize: 9, alignment: 'center' },
                { text: 'Estado', bold: true, color: 'white', fillColor: COLOR_PRIMARIO, fontSize: 9, alignment: 'center' },
                { text: 'Subtotal', bold: true, color: 'white', fillColor: COLOR_PRIMARIO, fontSize: 9, alignment: 'right' },
                { text: 'Desc.', bold: true, color: 'white', fillColor: COLOR_PRIMARIO, fontSize: 9, alignment: 'center' },
                { text: 'Total', bold: true, color: 'white', fillColor: COLOR_PRIMARIO, fontSize: 9, alignment: 'right' },
                { text: 'Fecha', bold: true, color: 'white', fillColor: COLOR_PRIMARIO, fontSize: 9, alignment: 'center' },
              ],
              ...filas,
            ],
          },
          layout: {
            fillColor: (i: number) => {
              if (i === 0) return COLOR_PRIMARIO;
              return i % 2 === 0 ? COLOR_SECUNDARIO : null;
            },
            hLineWidth: () => 0.5,
            vLineWidth: () => 0,
            hLineColor: () => '#dddddd',
          },
          fontSize: 9,
        },
      ],
    };

    return buildPdf(docDefinition);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. REPORTE DE PRODUCTOS MAS VENDIDOS (PDF)
  // ═══════════════════════════════════════════════════════════════════════════
  async generarReporteProductosVendidos(): Promise<Buffer> {
    // Traer todos los detalles de pedidos activos (no cancelados)
    const detalles = await this.detalleRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.producto', 'producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .leftJoin('d.pedido', 'pedido')
      .where('pedido.activo = :activo', { activo: true })
      .andWhere('pedido.estado != :cancelado', { cancelado: 'cancelado' })
      .getMany();

    // Agrupar por producto
    const mapaProductos = new Map<
      number,
      { nombre: string; categoria: string; cantidadTotal: number; ingresoTotal: number }
    >();

    for (const d of detalles) {
      const pid = d.productoId;
      if (!mapaProductos.has(pid)) {
        mapaProductos.set(pid, {
          nombre: d.producto?.nombre ?? `Producto #${pid}`,
          categoria: d.producto?.categoria?.nombre ?? 'Sin categoria',
          cantidadTotal: 0,
          ingresoTotal: 0,
        });
      }
      const entry = mapaProductos.get(pid)!;
      entry.cantidadTotal += d.cantidad;
      entry.ingresoTotal += Number(d.subtotal);
    }

    // Ordenar por cantidad vendida DESC
    const ranking = Array.from(mapaProductos.entries())
      .map(([, v]) => v)
      .sort((a, b) => b.cantidadTotal - a.cantidadTotal);

    const totalUnidades = ranking.reduce((s, r) => s + r.cantidadTotal, 0);
    const totalIngresos = ranking.reduce((s, r) => s + r.ingresoTotal, 0);

    const filas: any[] =
      ranking.length > 0
        ? ranking.map((r, i) => [
            { text: String(i + 1), alignment: 'center', bold: i < 3, color: i < 3 ? COLOR_ACENTO : '#333333' },
            { text: r.nombre, bold: i < 3 },
            { text: r.categoria, color: '#666666', fontSize: 9 },
            { text: String(r.cantidadTotal), alignment: 'center', bold: true },
            {
              text: `${((r.cantidadTotal / totalUnidades) * 100).toFixed(1)}%`,
              alignment: 'center',
              color: COLOR_ACENTO,
            },
            {
              text: `Bs. ${r.ingresoTotal.toFixed(2)}`,
              alignment: 'right',
              bold: i < 3,
              color: COLOR_PRIMARIO,
            },
          ])
        : [
            [
              { text: 'Sin datos de ventas', colSpan: 6, alignment: 'center', color: '#888888', italics: true },
              '', '', '', '', '',
            ],
          ];

    const encab = encabezado('Productos mas Vendidos', 'Ranking de productos por unidades vendidas (pedidos activos, excluye cancelados)');

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [40, 50, 40, 50],
      footer: piePagina,
      content: [
        ...encab,

        // Totales resumen
        {
          columns: [
            {
              stack: [
                { text: 'Total unidades vendidas', fontSize: 9, color: '#666666' },
                { text: String(totalUnidades), fontSize: 22, bold: true, color: COLOR_PRIMARIO },
              ],
              width: '30%',
            },
            {
              stack: [
                { text: 'Ingresos totales generados', fontSize: 9, color: '#666666' },
                { text: `Bs. ${totalIngresos.toFixed(2)}`, fontSize: 22, bold: true, color: COLOR_ACENTO },
              ],
              width: '40%',
            },
            {
              stack: [
                { text: 'Productos distintos vendidos', fontSize: 9, color: '#666666' },
                { text: String(ranking.length), fontSize: 22, bold: true, color: COLOR_PRIMARIO },
              ],
              width: '30%',
            },
          ],
          margin: [0, 0, 0, 20],
        },

        { text: 'RANKING DE PRODUCTOS', bold: true, fontSize: 11, color: COLOR_PRIMARIO, margin: [0, 0, 0, 6] },
        {
          table: {
            headerRows: 1,
            widths: [30, '*', 110, 60, 60, 80],
            body: [
              [
                { text: '#', bold: true, color: 'white', fillColor: COLOR_PRIMARIO, alignment: 'center' },
                { text: 'Producto', bold: true, color: 'white', fillColor: COLOR_PRIMARIO },
                { text: 'Categoria', bold: true, color: 'white', fillColor: COLOR_PRIMARIO },
                { text: 'Unidades', bold: true, color: 'white', fillColor: COLOR_PRIMARIO, alignment: 'center' },
                { text: '% Ventas', bold: true, color: 'white', fillColor: COLOR_PRIMARIO, alignment: 'center' },
                { text: 'Ingresos', bold: true, color: 'white', fillColor: COLOR_PRIMARIO, alignment: 'right' },
              ],
              ...filas,
            ],
          },
          layout: {
            fillColor: (i: number) => {
              if (i === 0) return COLOR_PRIMARIO;
              if (i <= 3) return '#FFF3E0'; // top 3 destacado
              return i % 2 === 0 ? COLOR_SECUNDARIO : null;
            },
            hLineWidth: () => 0.5,
            vLineWidth: () => 0,
            hLineColor: () => '#dddddd',
          },
        },
        {
          text: 'Los primeros 3 productos estan resaltados por ser los mas vendidos.',
          fontSize: 8,
          italics: true,
          color: '#aaaaaa',
          margin: [0, 8, 0, 0],
        },
      ],
    };

    return buildPdf(docDefinition);
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

    const agotados  = productos.filter(p => p.stock === 0);
    const criticos  = productos.filter(p => p.stock > 0 && p.stock < 5);
    const normales  = productos.filter(p => p.stock >= 5);
    const totalPrecio = productos.reduce((s, p) => s + Number(p.precio) * p.stock, 0);

    function estadoStock(stock: number): { texto: string; color: string } {
      if (stock === 0) return { texto: 'AGOTADO',  color: '#E74C3C' };
      if (stock < 5)   return { texto: 'CRITICO',  color: '#E67E22' };
      if (stock < 20)  return { texto: 'BAJO',     color: '#F1C40F' };
      return             { texto: 'OK',      color: '#27AE60' };
    }

    const filas: any[] =
      productos.length > 0
        ? productos.map(p => {
            const est = estadoStock(p.stock);
            return [
              { text: p.nombre },
              { text: p.categoria?.nombre ?? 'Sin categoria', color: '#666666', fontSize: 9 },
              { text: `Bs. ${Number(p.precio).toFixed(2)}`, alignment: 'right' },
              {
                text: String(p.stock),
                alignment: 'center',
                bold: true,
                color: est.color,
              },
              {
                text: est.texto,
                alignment: 'center',
                bold: true,
                color: est.color,
                fontSize: 9,
              },
              {
                text: `Bs. ${(Number(p.precio) * p.stock).toFixed(2)}`,
                alignment: 'right',
                color: COLOR_PRIMARIO,
              },
            ];
          })
        : [
            [
              { text: 'No hay productos registrados', colSpan: 6, alignment: 'center', color: '#888888', italics: true },
              '', '', '', '', '',
            ],
          ];

    const encab = encabezado('Reporte de Stock', 'Estado actual del inventario de productos activos');

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [40, 50, 40, 50],
      footer: piePagina,
      content: [
        ...encab,

        // Resumen de alertas
        {
          columns: [
            {
              stack: [
                { text: String(agotados.length), fontSize: 28, bold: true, color: '#E74C3C', alignment: 'center' },
                { text: 'Agotados', fontSize: 9, color: '#888888', alignment: 'center' },
              ],
              width: '25%',
            },
            {
              stack: [
                { text: String(criticos.length), fontSize: 28, bold: true, color: '#E67E22', alignment: 'center' },
                { text: 'Stock critico (< 5)', fontSize: 9, color: '#888888', alignment: 'center' },
              ],
              width: '25%',
            },
            {
              stack: [
                { text: String(normales.length), fontSize: 28, bold: true, color: '#27AE60', alignment: 'center' },
                { text: 'Stock suficiente', fontSize: 9, color: '#888888', alignment: 'center' },
              ],
              width: '25%',
            },
            {
              stack: [
                { text: `Bs. ${totalPrecio.toFixed(2)}`, fontSize: 16, bold: true, color: COLOR_PRIMARIO, alignment: 'center' },
                { text: 'Valor total inventario', fontSize: 9, color: '#888888', alignment: 'center' },
              ],
              width: '25%',
            },
          ],
          margin: [0, 0, 0, 20],
        },

        { text: 'INVENTARIO DETALLADO', bold: true, fontSize: 11, color: COLOR_PRIMARIO, margin: [0, 0, 0, 6] },
        {
          table: {
            headerRows: 1,
            widths: ['*', 100, 65, 45, 55, 75],
            body: [
              [
                { text: 'Producto', bold: true, color: 'white', fillColor: COLOR_PRIMARIO },
                { text: 'Categoria', bold: true, color: 'white', fillColor: COLOR_PRIMARIO },
                { text: 'Precio', bold: true, color: 'white', fillColor: COLOR_PRIMARIO, alignment: 'right' },
                { text: 'Stock', bold: true, color: 'white', fillColor: COLOR_PRIMARIO, alignment: 'center' },
                { text: 'Estado', bold: true, color: 'white', fillColor: COLOR_PRIMARIO, alignment: 'center' },
                { text: 'Valor total', bold: true, color: 'white', fillColor: COLOR_PRIMARIO, alignment: 'right' },
              ],
              ...filas,
            ],
          },
          layout: {
            fillColor: (i: number) => {
              if (i === 0) return COLOR_PRIMARIO;
              return i % 2 === 0 ? COLOR_SECUNDARIO : null;
            },
            hLineWidth: () => 0.5,
            vLineWidth: () => 0,
            hLineColor: () => '#dddddd',
          },
          fontSize: 9,
        },
        {
          text: 'Critico = menos de 5 unidades. Se recomienda reabastecer inmediatamente los productos agotados y criticos.',
          fontSize: 8,
          italics: true,
          color: '#aaaaaa',
          margin: [0, 8, 0, 0],
        },
      ],
    };

    return buildPdf(docDefinition);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. BOLETA / COMPROBANTE INDIVIDUAL DE UN PEDIDO (PDF)
  // ═══════════════════════════════════════════════════════════════════════════
  async generarBoletaPedido(id: number): Promise<Buffer> {
    const pedido = await this.pedidosRepo.findOne({
      where: { id, activo: true },
      relations: { cliente: true, detalles: true },
    });

    if (!pedido) throw new NotFoundException(`Pedido #${id} no encontrado`);

    const nombreCliente = pedido.cliente?.nombre ?? pedido.clienteNombre ?? 'Cliente presencial';
    const telefonoCliente = pedido.cliente?.email ?? pedido.clienteTelefono ?? '-';

    const filasDetalle = pedido.detalles.map(d => [
      { text: d.producto?.nombre ?? `Producto #${d.productoId}` },
      { text: String(d.cantidad), alignment: 'center' },
      { text: `Bs. ${Number(d.precioUnitario).toFixed(2)}`, alignment: 'right' },
      { text: `Bs. ${Number(d.subtotal).toFixed(2)}`, alignment: 'right', bold: true },
    ]);

    const est = {
      texto: pedido.estado.replace('_', ' ').toUpperCase(),
      color: colorEstado(pedido.estado),
    };

    const docDefinition: any = {
      pageSize: 'A5',
      pageMargins: [30, 40, 30, 40],
      footer: (cur: number, total: number) => ({
        text: `${MARCA} - Gracias por su preferencia | Pagina ${cur} de ${total}`,
        alignment: 'center',
        fontSize: 7,
        color: '#aaaaaa',
        margin: [0, 0],
      }),
      content: [
        // Encabezado boleta
        { text: MARCA, fontSize: 22, bold: true, color: COLOR_PRIMARIO, alignment: 'center' },
        { text: SUBTITULO, fontSize: 10, color: COLOR_ACENTO, alignment: 'center', margin: [0, 2, 0, 2] },
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 355, y2: 0, lineWidth: 1.5, lineColor: COLOR_PRIMARIO }],
          margin: [0, 4, 0, 10],
        },

        // Datos del pedido
        {
          columns: [
            {
              stack: [
                { text: `PEDIDO N° ${String(pedido.id).padStart(6, '0')}`, fontSize: 13, bold: true, color: COLOR_PRIMARIO },
                { text: `Fecha: ${new Date(pedido.fecha).toLocaleDateString('es-BO')}`, fontSize: 9, color: '#555555', margin: [0, 3, 0, 0] },
                { text: `Hora: ${new Date(pedido.fecha).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}`, fontSize: 9, color: '#555555' },
              ],
            },
            {
              stack: [
                {
                  text: est.texto,
                  fontSize: 13,
                  bold: true,
                  color: est.color,
                  alignment: 'right',
                },
                {
                  text: pedido.tipoEntrega === 'delivery' ? 'Entrega: DELIVERY' : 'Entrega: PRESENCIAL',
                  fontSize: 9,
                  color: '#555555',
                  alignment: 'right',
                  margin: [0, 3, 0, 0],
                },
              ],
            },
          ],
          margin: [0, 0, 0, 12],
        },

        // Datos del cliente
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  stack: [
                    { text: 'DATOS DEL CLIENTE', fontSize: 8, bold: true, color: 'white' },
                    { text: nombreCliente, fontSize: 11, bold: true, color: 'white', margin: [0, 2, 0, 0] },
                    { text: telefonoCliente, fontSize: 9, color: '#F5E6D3' },
                  ],
                  fillColor: COLOR_PRIMARIO,
                  margin: [8, 6, 8, 6],
                },
              ],
            ],
          },
          layout: { defaultBorder: false },
          margin: [0, 0, 0, 12],
        },

        // Tabla de productos
        { text: 'PRODUCTOS DEL PEDIDO', fontSize: 9, bold: true, color: COLOR_PRIMARIO, margin: [0, 0, 0, 4] },
        {
          table: {
            headerRows: 1,
            widths: ['*', 35, 60, 65],
            body: [
              [
                { text: 'Producto', bold: true, color: 'white', fillColor: COLOR_PRIMARIO, fontSize: 9 },
                { text: 'Cant.', bold: true, color: 'white', fillColor: COLOR_PRIMARIO, fontSize: 9, alignment: 'center' },
                { text: 'Precio', bold: true, color: 'white', fillColor: COLOR_PRIMARIO, fontSize: 9, alignment: 'right' },
                { text: 'Subtotal', bold: true, color: 'white', fillColor: COLOR_PRIMARIO, fontSize: 9, alignment: 'right' },
              ],
              ...filasDetalle,
            ],
          },
          layout: {
            fillColor: (i: number) => {
              if (i === 0) return COLOR_PRIMARIO;
              return i % 2 === 0 ? COLOR_SECUNDARIO : null;
            },
            hLineWidth: () => 0.5,
            vLineWidth: () => 0,
            hLineColor: () => '#dddddd',
          },
          fontSize: 9,
          margin: [0, 0, 0, 10],
        },

        // Totales finales
        {
          table: {
            widths: ['*', 80],
            body: [
              [
                { text: 'Subtotal', fontSize: 9 },
                { text: `Bs. ${Number(pedido.subtotal).toFixed(2)}`, alignment: 'right', fontSize: 9 },
              ],
              ...(pedido.porcentajeDescuento > 0
                ? [
                    [
                      { text: `Descuento (${pedido.porcentajeDescuento}%)`, fontSize: 9, color: COLOR_ACENTO },
                      { text: `- Bs. ${Number(pedido.descuento).toFixed(2)}`, alignment: 'right', fontSize: 9, color: COLOR_ACENTO },
                    ],
                  ]
                : []),
              [
                { text: 'TOTAL', fontSize: 13, bold: true, color: COLOR_PRIMARIO },
                { text: `Bs. ${Number(pedido.total).toFixed(2)}`, alignment: 'right', fontSize: 13, bold: true, color: COLOR_PRIMARIO },
              ],
              ...(pedido.tipoEntrega === 'delivery' && Number(pedido.anticipo) > 0
                ? [
                    [
                      { text: 'Anticipo pagado (50%)', fontSize: 9, color: '#555555' },
                      { text: `Bs. ${Number(pedido.anticipo).toFixed(2)}`, alignment: 'right', fontSize: 9, color: '#555555' },
                    ],
                    [
                      { text: 'Saldo pendiente', fontSize: 9, bold: true, color: '#E74C3C' },
                      {
                        text: `Bs. ${(Number(pedido.total) - Number(pedido.anticipo)).toFixed(2)}`,
                        alignment: 'right',
                        fontSize: 9,
                        bold: true,
                        color: '#E74C3C',
                      },
                    ],
                  ]
                : []),
            ],
          },
          layout: {
            fillColor: (i: number, _node: any, _col: any) => {
              const filaTotal = pedido.porcentajeDescuento > 0 ? 2 : 1;
              return i === filaTotal ? COLOR_SECUNDARIO : null;
            },
            hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length ? 1 : 0.5),
            vLineWidth: () => 0,
            hLineColor: (i: number, node: any) => (i === 0 || i === node.table.body.length ? COLOR_PRIMARIO : '#dddddd'),
          },
        },

        // Mensaje final
        {
          canvas: [{ type: 'line', x1: 0, y1: 0, x2: 355, y2: 0, lineWidth: 0.5, lineColor: '#cccccc' }],
          margin: [0, 14, 0, 8],
        },
        {
          text: 'Gracias por elegirnos. Vuelva pronto.',
          alignment: 'center',
          fontSize: 9,
          italics: true,
          color: COLOR_ACENTO,
        },
      ],
    };

    return buildPdf(docDefinition);
  }
}
