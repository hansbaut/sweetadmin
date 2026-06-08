import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('reportes')
@UseGuards(JwtAuthGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('ventas/pdf')
  async reporteVentasPdf(@Res() res: any) {
    const buffer = await this.reportesService.generarReporteVentas();
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="reporte-ventas.pdf"',
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get('estadisticas')
  estadisticas() {
    return this.reportesService.obtenerEstadisticas();
  }
}
