import type { Licencia } from '@/lib/tipos'

const FORMATO_FECHA = new Intl.DateTimeFormat('es', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '—'

  const fecha = new Date(iso)

  return Number.isNaN(fecha.getTime()) ? '—' : FORMATO_FECHA.format(fecha)
}

export function nombreCompleto(usuario: { name: string; apellidoPaterno?: string | null } | null | undefined): string {
  if (!usuario) return '—'

  return [usuario.name, usuario.apellidoPaterno].filter(Boolean).join(' ')
}

export type EstadoLicencia =
  | { clave: 'vigente'; etiqueta: string }
  | { clave: 'por_vencer'; etiqueta: string }
  | { clave: 'vencida'; etiqueta: string }
  | { clave: 'suspendida'; etiqueta: string }
  | { clave: 'inactiva'; etiqueta: string }

const DIA_MS = 86_400_000

/**
 * Estado visible de una licencia: combina el campo `estado` del backend con la
 * fecha de expiracion, igual que Licencia::estaVencida() en glucyai.
 */
export function estadoLicencia(licencia: Licencia): EstadoLicencia {
  if (licencia.estado === 'suspendida') return { clave: 'suspendida', etiqueta: 'Suspendida' }
  if (licencia.estado === 'inactiva') return { clave: 'inactiva', etiqueta: 'Inactiva' }

  if (licencia.fecha_expiracion) {
    const vence = new Date(licencia.fecha_expiracion).getTime()
    const dias = Math.ceil((vence - Date.now()) / DIA_MS)

    if (licencia.estado === 'vencida' || dias < 0) return { clave: 'vencida', etiqueta: 'Vencida' }
    if (dias <= 30) {
      return {
        clave: 'por_vencer',
        etiqueta: dias === 0 ? 'Vence hoy' : `Vence en ${dias} ${dias === 1 ? 'dia' : 'dias'}`,
      }
    }
  } else if (licencia.estado === 'vencida') {
    return { clave: 'vencida', etiqueta: 'Vencida' }
  }

  return { clave: 'vigente', etiqueta: 'Vigente' }
}
