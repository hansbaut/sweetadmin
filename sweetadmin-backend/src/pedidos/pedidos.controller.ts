import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { PedidosService, CrearPedidoDto } from './pedidos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('pedidos')
@UseGuards(JwtAuthGuard)
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get()
  listar() {
    return this.pedidosService.listar();
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.pedidosService.obtener(+id);
  }

  @Post()
  crear(@Body() body: CrearPedidoDto, @Request() req: any) {
    // Si el que crea es un cliente registrado, asignar su ID automáticamente
    if (req.user.rol === 'cliente') {
      body.clienteId = req.user.id;
    }
    return this.pedidosService.crear(body);
  }

  @Put(':id/estado')
  cambiarEstado(@Param('id') id: string, @Body() body: { estado: string }) {
    return this.pedidosService.cambiarEstado(+id, body.estado);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.pedidosService.eliminar(+id);
  }
}
