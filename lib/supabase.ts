import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase usando variables de entorno
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Las variables de entorno SUPABASE_URL y SUPABASE_ANON_KEY son requeridas')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Tipos para TypeScript
export interface Cancha {
  id: string
  nombre: string
  descripcion?: string
  precio_hora: number
  activa: boolean
  created_at: string
  updated_at: string
}

export interface Producto {
  id: string
  nombre: string
  precio: number
  stock: number
  categoria: 'bebidas' | 'kiosco'
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Reserva {
  id: string
  fecha: string
  hora_inicio: string
  hora_fin: string
  cancha_id: string
  usuario_id: string
  responsable: string // Campo obligatorio de texto (50 caracteres)
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada'
  tipo: 'cancha' | 'cumpleanos'
  precio: number
  pagada: boolean
  venta_id?: string
  observaciones?: string
  created_at: string
  updated_at: string
  // Relaciones
  canchas?: Cancha
}

export interface Venta {
  id: string
  fecha: string
  total: number
  metodo_pago: 'efectivo' | 'mercadopago' | 'mixto' // Agregamos 'mixto' para pagos combinados
  usuario_id: string
  tipo_venta: 'cancha_cumpleanos' | 'bebidas' | 'kiosco'
  reserva_id?: string
  observaciones?: string
  created_at: string
}

// Nueva interfaz para manejar pagos múltiples
export interface PagoVenta {
  id: string
  venta_id: string
  metodo_pago: 'efectivo' | 'mercadopago'
  monto: number
  created_at: string
}

export interface ItemVenta {
  id: string
  venta_id: string
  producto_id: string
  cantidad: number
  precio_unitario: number
  subtotal: number
  created_at: string
  // Relaciones
  productos?: Producto
}