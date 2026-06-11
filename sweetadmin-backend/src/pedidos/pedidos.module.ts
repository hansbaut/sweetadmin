import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';
import { Pedido } from './pedido.entity';
import { PedidoDetalle } from './pedido-detalle.entity';  // ← nuevo
import { Producto } from '../productos/producto.entity';   // ← nuevo

@Module({
  imports: [TypeOrmModule.forFeature([Pedido, PedidoDetalle, Producto])], // ← agregar los dos
  controllers: [PedidosController],
  providers: [PedidosService],
})
export class PedidosModule {}
