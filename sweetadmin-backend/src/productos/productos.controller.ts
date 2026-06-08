import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('productos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Get()
  listar() {
    return this.productosService.listar();
  }

  @Get(':id')
  obtener(@Param('id') id: string) {
    return this.productosService.obtener(+id);
  }

  @Post()
  @Roles('admin', 'empleado')
  crear(@Body() dto: CreateProductoDto) {
    return this.productosService.crear(dto);
  }

  @Put(':id')
  @Roles('admin', 'empleado')
  actualizar(@Param('id') id: string, @Body() dto: Partial<CreateProductoDto>) {
    return this.productosService.actualizar(+id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  eliminar(@Param('id') id: string) {
    return this.productosService.eliminar(+id);
  }
}
