import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('categorias')
@UseGuards(JwtAuthGuard)
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Get()
  listar() { return this.categoriasService.listar(); }

  @Post()
  crear(@Body() body: { nombre: string }) {
    return this.categoriasService.crear(body.nombre);
  }

  @Delete(':id')
  eliminar(@Param('id') id: string) {
    return this.categoriasService.eliminar(+id);
  }
}
