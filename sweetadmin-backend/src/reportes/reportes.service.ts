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

    const filas = pedidos.map(p => `
      <tr>
        <td>${p.id}</td>
        <td>${p.cliente?.nombre ?? 'Sin cliente'}</td>
        <td>Bs. ${Number(p.total).toFixed(2)}</td>
        <td>${p.estado}</td>
        <td>${new Date(p.fecha).toLocaleDateString('es-BO')}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #1F4E79; text-align: center; margin-bottom: 4px; }
          p { text-align: center; color: #888; margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; }
          th { background: #1F4E79; color: white; padding: 10px 8px; text-align: left; font-size: 13px; }
          td { padding: 8px; border-bottom: 1px solid #eee; font-size: 12px; }
          tr:nth-child(even) { background: #f5f5f5; }
          .total { text-align: right; margin-top: 16px; font-size: 15px; font-weight: bold; color: #1F4E79; }
        </style>
      </head>
      <body>
        <h1>SweetAdmin — Reporte de Ventas</h1>
        <p>Panadería y Pastelería</p>
        <p>Generado: ${fecha}</p>
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Cliente</th><th>Total (Bs.)</th><th>Estado</th><th>Fecha</th>
            </tr>
          </thead>
          <tbody>${filas || '<tr><td colspan="5" style="text-align:center;color:#888;">Sin pedidos registrados</td></tr>'}</tbody>
        </table>
        <p class="total">Total General: Bs. ${totalGeneral.toFixed(2)}</p>
      </body>
      </html>
    `;

    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    return Buffer.from(pdfBuffer);
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
