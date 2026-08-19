import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Clinica, EstadoEstudio } from '@/lib/tipos'
import type { EstadoLicencia } from '@/lib/formato'

// Tintes de estado del brand kit: salud #2EE6A8, warn #E8A33D, alert #E8574B.
const TINTES: Record<string, string> = {
  positivo: 'border-transparent bg-[#DDF8EE] text-[#0A6E5C] dark:bg-[#0E4A3C] dark:text-[#7FEFC9]',
  advertencia: 'border-transparent bg-[#FBEFD9] text-[#9A6A1B] dark:bg-[#4A3A14] dark:text-[#F2C879]',
  negativo: 'border-transparent bg-[#FCE1DE] text-[#B03A30] dark:bg-[#54211D] dark:text-[#F5A79F]',
  neutro: 'border-transparent bg-muted text-muted-foreground',
}

export function InsigniaLicencia({ estado }: { estado: EstadoLicencia }) {
  const tinte =
    estado.clave === 'vigente'
      ? TINTES.positivo
      : estado.clave === 'por_vencer'
        ? TINTES.advertencia
        : estado.clave === 'inactiva'
          ? TINTES.neutro
          : TINTES.negativo

  return <Badge className={cn('font-medium', tinte)}>{estado.etiqueta}</Badge>
}

const ETIQUETA_CLINICA: Record<Clinica['estado'], string> = {
  activa: 'Activa',
  pago_pendiente: 'Pago pendiente',
  suspendida: 'Suspendida',
}

export function InsigniaClinica({ estado }: { estado: Clinica['estado'] }) {
  const tinte =
    estado === 'activa' ? TINTES.positivo : estado === 'pago_pendiente' ? TINTES.advertencia : TINTES.negativo

  return <Badge className={cn('font-medium', tinte)}>{ETIQUETA_CLINICA[estado]}</Badge>
}

const ETIQUETA_ESTUDIO: Record<EstadoEstudio, string> = {
  pendiente: 'Pendiente',
  en_revision: 'En revisión',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
}

export function InsigniaEstudio({ estado }: { estado: EstadoEstudio }) {
  const tinte =
    estado === 'aprobado'
      ? TINTES.positivo
      : estado === 'rechazado'
        ? TINTES.negativo
        : estado === 'en_revision'
          ? TINTES.advertencia
          : TINTES.neutro

  return <Badge className={cn('font-medium', tinte)}>{ETIQUETA_ESTUDIO[estado]}</Badge>
}
