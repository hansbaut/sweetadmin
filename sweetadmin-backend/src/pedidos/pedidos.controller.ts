import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('pedidos')
@UseGuards(JwtAuthGuard)
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get()
  listar() { return this.pedidosService.listar(); }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.pedidosService.obtener(+id);
  }

  @Post()
  crear(@Body() body: { clienteId: number }) {
    return this.pedidosService.crear(body.clienteId);
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
