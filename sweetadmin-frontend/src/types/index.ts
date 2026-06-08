export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}

export interface Producto {
  id: number;
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
  imagen?: string;
  activo: boolean;
}

export interface Pedido {
  id: number;
  total: number;
  estado: string;
  fecha: string;
  activo: boolean;
}

export interface AuthResponse {
  access_token: string;
  usuario: Usuario;
}