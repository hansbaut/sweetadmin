import { IsString, IsNumber, IsPositive, IsOptional, MinLength } from 'class-validator';

export class CreateProductoDto {
  @IsString()
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsNumber()
  @IsPositive({ message: 'El precio debe ser mayor a 0' })
  precio: number;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsString()
  imagen?: string;
}