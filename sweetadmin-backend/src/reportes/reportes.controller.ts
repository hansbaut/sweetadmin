import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  // GET /reportes/estadisticas
  // Resumen general: totales, estados, stock bajo
  @Get('estadisticas')
  estadisticas() {
    return this.reportesService.obtenerEstadisticas();
  }

  // GET /reportes/ventas/pdf?desde=2025-01-01&hasta=2025-12-31
  // Reporte de ventas por rango de fechas
  @Get('ventas/pdf')
  async reporteVentasPdf(
    @Res() res: any,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    const buffer = await this.reportesService.generarReporteVentas(desde, hasta);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="reporte-ventas.pdf"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // GET /reportes/productos-vendidos/pdf
  // Ranking de productos mas vendidos
  @Get('productos-vendidos/pdf')
  async reporteProductosVendidos(@Res() res: any) {
    const buffer = await this.reportesService.generarReporteProductosVendidos();
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="reporte-productos-vendidos.pdf"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // GET /reportes/stock/pdf
  // Estado actual del stock de todos los productos
  @Get('stock/pdf')
  async reporteStock(@Res() res: any) {
    const buffer = await this.reportesService.generarReporteStock();
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="reporte-stock.pdf"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  // GET /reportes/pedido/:id/pdf
  // Boleta/comprobante individual de un pedido
  @Get('pedido/:id/pdf')
  async boletaPedido(@Param('id', ParseIntPipe) id: number, @Res() res: any) {
    const buffer = await this.reportesService.generarBoletaPedido(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="pedido-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
