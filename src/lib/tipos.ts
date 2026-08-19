// Tipos espejo de los modelos de glucyai (Laravel). Solo los campos que el
// panel consume; el backend puede mandar mas y se ignoran.

export type Rol = 'admin' | 'doctor' | 'paciente'

export interface Usuario {
  id: number
  name: string
  apellidoPaterno?: string | null
  apellidoMaterno?: string | null
  email: string
  telefono?: string | null
  rol: Rol
  doctor?: Doctor | null
  paciente?: Paciente | null
}

export interface Doctor {
  id: number
  usuarioId: number
  clinicaId?: number | null
  clinica?: Clinica | null
}

export interface Clinica {
  id: number
  nombre: string
  descripcion?: string | null
  direccion?: string | null
  telefono?: string | null
  email?: string | null
  nit?: string | null
  estado: 'activa' | 'pago_pendiente' | 'suspendida'
  planId?: number | null
  created_at?: string
}

export interface Paciente {
  id: number
  usuarioId: number
  clinicaId?: number | null
  tipoDiabetes?: string | null
  sexo?: 'femenino' | 'masculino' | 'otro' | null
  fechaNacimiento?: string | null
  pesoKg?: number | string | null
  tallaCm?: number | null
  diagnosticadoEn?: string | null
  alergias?: string | null
  comorbilidades?: string | null
  tabaquismo?: boolean | number | null
  contactoEmergencia?: string | null
  usuario?: Usuario | null
  clinica?: Clinica | null
  created_at?: string
}

export interface Plan {
  id: number
  nombre: string
  ambito?: 'paciente' | 'clinica' | null
  periodicidad?: string | null
  precio?: number | null
}

export interface Licencia {
  id: number
  codigo: string
  nombre?: string | null
  estado: 'activa' | 'inactiva' | 'suspendida' | 'vencida'
  clinicaId?: number | null
  planId?: number | null
  cantidad: number
  usadas: number
  fecha_expiracion?: string | null
  descuento?: number | null
  clinica?: Clinica | null
  plan?: Plan | null
}

/** Forma del paginador de Laravel que devuelve todo `listar()`. */
export interface Paginado<T> {
  current_page: number
  data: T[]
  last_page: number
  per_page: number
  total: number
}

export interface Sesion {
  token: string
  usuario: Usuario
}

export interface TipoEstudio {
  id: number
  nombre: string
  unidad?: string | null
  rangoMin?: number | null
  rangoMax?: number | null
}

export interface Archivo {
  id: number
  nombre: string
  mime?: string | null
  sizeBytes?: number | null
}

export type EstadoEstudio = 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado'

export interface EstudioMedico {
  id: number
  tipoEstudioId: number
  pacienteId: number
  archivoId?: number | null
  descripcion?: string | null
  fecha: string
  valor?: number | null
  unidad?: string | null
  estado: EstadoEstudio
  motivoRechazo?: string | null
  validadoEn?: string | null
  intento: number
  origen: 'carga' | 'laboratorio'
  /** Eloquent serializa las relaciones en snake_case: `tipoEstudio` llega como `tipo_estudio`. */
  tipo_estudio?: TipoEstudio | null
  archivo?: Archivo | null
  paciente?: Paciente | null
  created_at?: string
}

/** Respuesta de POST /archivos/{id}/enlace: URL firmada de vida corta. */
export interface EnlaceArchivo {
  url: string
  expiraEn: string
}
