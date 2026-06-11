import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pedido } from '../pedidos/pedido.entity';
import { Producto } from '../productos/producto.entity';

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Pedido)
    private pedidosRepo: Repository<Pedido>,
    @InjectRepository(Producto)
    private productosRepo: Repository<Producto>,
  ) {}

  async generarReporteVentas(): Promise<Buffer> {
    const pedidos = await this.pedidosRepo.find({
      where: { activo: true },
      relations: { cliente: true },
      order: { fecha: 'DESC' },
      take: 50,
    });

    const totalGeneral = pedidos.reduce((sum, p) => sum + Number(p.total), 0);
    const fecha = new Date().toLocaleDateString('es-BO');

    // Filas de datos
    const filas: any[] = pedidos.map(p => [
      String(p.id),
      p.cliente?.nombre ?? 'Sin cliente',
      `Bs. ${Number(p.total).toFixed(2)}`,
      p.estado,
      new Date(p.fecha).toLocaleDateString('es-BO'),
    ]);

    const bodyData: any[] =
      filas.length > 0
        ? filas
        : [
            [
              { text: 'Sin pedidos registrados', colSpan: 5, alignment: 'center', color: '#888888' },
              '', '', '', '',
            ],
          ];

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pdfMake = require('pdfmake/build/pdfmake');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const vfsFonts = require('pdfmake/build/vfs_fonts');
    pdfMake.vfs = vfsFonts.vfs;

    const docDefinition: any = {
      pageSize: 'A4',
      pageMargins: [40, 60, 40, 60],
      content: [
        {
          text: 'SweetAdmin — Reporte de Ventas',
          fontSize: 20,
          bold: true,
          color: '#1F4E79',
          alignment: 'center',
          margin: [0, 0, 0, 4],
        },
        {
          text: 'Panadería y Pastelería',
          alignment: 'center',
          color: '#888888',
          fontSize: 11,
          margin: [0, 0, 0, 2],
        },
        {
          text: `Generado: ${fecha}`,
          alignment: 'center',
          color: '#888888',
          fontSize: 10,
          margin: [0, 0, 0, 20],
        },
        {
          table: {
            headerRows: 1,
            widths: [40, '*', 90, 90, 80],
            body: [
              [
                { text: 'ID', bold: true, color: 'white', fillColor: '#1F4E79', fontSize: 12 },
                { text: 'Cliente', bold: true, color: 'white', fillColor: '#1F4E79', fontSize: 12 },
                { text: 'Total (Bs.)', bold: true, color: 'white', fillColor: '#1F4E79', fontSize: 12 },
                { text: 'Estado', bold: true, color: 'white', fillColor: '#1F4E79', fontSize: 12 },
                { text: 'Fecha', bold: true, color: 'white', fillColor: '#1F4E79', fontSize: 12 },
              ],
              ...bodyData,
            ],
          },
          layout: {
            fillColor: (rowIndex: number) => {
              if (rowIndex === 0) return '#1F4E79';
              return rowIndex % 2 === 0 ? '#F5F5F5' : null;
            },
            hLineWidth: () => 0.5,
            vLineWidth: () => 0,
            hLineColor: () => '#EEEEEE',
          },
        },
        {
          text: `Total General: Bs. ${totalGeneral.toFixed(2)}`,
          alignment: 'right',
          bold: true,
          fontSize: 14,
          color: '#1F4E79',
          margin: [0, 16, 0, 0],
        },
      ],
    };

    return new Promise((resolve, reject) => {
      try {
        const pdfDoc = pdfMake.createPdf(docDefinition);
        pdfDoc.getBuffer((buffer: Buffer) => {
          resolve(buffer);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  async obtenerEstadisticas() {
    const productos = await this.productosRepo.find({ where: { activo: true } });
    const pedidos = await this.pedidosRepo.find({ where: { activo: true } });

    const totalVentas = pedidos.reduce((sum, p) => sum + Number(p.total), 0);
    const pedidosPorEstado = {
      pendiente: pedidos.filter(p => p.estado === 'pendiente').length,
      en_proceso: pedidos.filter(p => p.estado === 'en_proceso').length,
      listo: pedidos.filter(p => p.estado === 'listo').length,
      entregado: pedidos.filter(p => p.estado === 'entregado').length,
      cancelado: pedidos.filter(p => p.estado === 'cancelado').length,
    };

    const productosStockBajo = productos.filter(p => p.stock < 5);

    return {
      totalProductos: productos.length,
      totalPedidos: pedidos.length,
      totalVentas,
      pedidosPorEstado,
      productosStockBajo: productosStockBajo.map(p => ({
        id: p.id,
        nombre: p.nombre,
        stock: p.stock,
      })),
    };
  }
}
