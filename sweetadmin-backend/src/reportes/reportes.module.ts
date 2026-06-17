import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { Pedido } from '../pedidos/pedido.entity';
import { PedidoDetalle } from '../pedidos/pedido-detalle.entity';
import { Producto } from '../productos/producto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pedido, PedidoDetalle, Producto])],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}
