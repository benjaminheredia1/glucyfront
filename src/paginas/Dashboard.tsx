import { useCallback } from 'react'
import { BadgeCheck, ClipboardList, TriangleAlert, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { api } from '@/lib/api'
import { estadoLicencia } from '@/lib/formato'
import type { Clinica, Licencia, Paciente, Paginado } from '@/lib/tipos'
import { usePeticion } from '@/lib/usePeticion'
import { Encabezado } from '@/components/panel/Encabezado'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface Resumen {
  clinicasActivas: number
  pacientesTotales: number
  vigentes: number
  porVencer: number
  vencidas: number
  pacientesPorClinica: { nombre: string; total: number }[]
}

async function cargarResumen(): Promise<Resumen> {
  const [clinicas, pacientes, licencias] = await Promise.all([
    api.get<Paginado<Clinica>>('/clinicas', { porPagina: 100 }),
    api.get<Paginado<Paciente>>('/pacientes', { porPagina: 1 }),
    api.get<Paginado<Licencia>>('/licencias', { porPagina: 100 }),
  ])

  const estados = licencias.data.map(estadoLicencia)

  // Conteo por clinica via el paginador: porPagina=1 y leer `total`.
  const activas = clinicas.data.filter((c) => c.estado === 'activa')
  const pacientesPorClinica = await Promise.all(
    activas.slice(0, 6).map(async (clinica) => {
      const pagina = await api.get<Paginado<Paciente>>('/pacientes', {
        clinicaId: clinica.id,
        porPagina: 1,
      })

      return { nombre: clinica.nombre, total: pagina.total }
    }),
  )

  return {
    clinicasActivas: activas.length,
    pacientesTotales: pacientes.total,
    vigentes: estados.filter((e) => e.clave === 'vigente').length,
    porVencer: estados.filter((e) => e.clave === 'por_vencer').length,
    vencidas: estados.filter((e) => e.clave === 'vencida' || e.clave === 'suspendida').length,
    pacientesPorClinica,
  }
}

function TarjetaCifra({
  Icono,
  valor,
  etiqueta,
  tono = 'primario',
}: {
  Icono: LucideIcon
  valor: number
  etiqueta: string
  tono?: 'primario' | 'alerta'
}) {
  return (
    <Card>
      <CardContent className="px-6">
        <span
          aria-hidden
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg',
            tono === 'alerta' ? 'bg-[#FCE1DE] text-[#B03A30]' : 'bg-secondary text-secondary-foreground',
          )}
        >
          <Icono className="h-5 w-5" />
        </span>
        <p
          className={cn(
            'mt-3 font-heading text-3xl font-bold',
            tono === 'alerta' ? 'text-[#D2483C]' : 'text-foreground',
          )}
        >
          {valor}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{etiqueta}</p>
      </CardContent>
    </Card>
  )
}

function BarrasPorClinica({ datos }: { datos: { nombre: string; total: number }[] }) {
  const maximo = Math.max(...datos.map((d) => d.total), 1)

  return (
    <div
      role="img"
      aria-label={`Pacientes por clínica: ${datos.map((d) => `${d.nombre} ${d.total}`).join(', ')}`}
      className="flex h-56 items-end justify-around gap-4 pt-2"
    >
      {datos.map((dato) => (
        <div key={dato.nombre} className="flex h-full w-full max-w-24 flex-col items-center justify-end gap-2">
          <span className="text-sm font-semibold">{dato.total}</span>
          <div
            title={`${dato.nombre}: ${dato.total} pacientes`}
            className="w-full rounded-t-[4px] bg-primary transition-[height]"
            style={{ height: `${Math.max((dato.total / maximo) * 100, 2)}%` }}
          />
          <span className="max-w-full truncate text-xs text-muted-foreground">{dato.nombre}</span>
        </div>
      ))}
    </div>
  )
}

function FilaLicencias({
  etiqueta,
  valor,
  total,
  color,
}: {
  etiqueta: string
  valor: number
  total: number
  color: string
}) {
  const proporcion = total > 0 ? (valor / total) * 100 : 0

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
          {etiqueta}
        </span>
        <span className="font-semibold">{valor}</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
        <div className="h-full rounded-full" style={{ width: `${proporcion}%`, background: color }} />
      </div>
    </div>
  )
}

export function Dashboard() {
  const pedir = useCallback(() => cargarResumen(), [])
  const { datos, cargando, error } = usePeticion(pedir)

  const mes = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(new Date())
  const totalLicencias = datos ? datos.vigentes + datos.porVencer + datos.vencidas : 0

  return (
    <>
      <Encabezado titulo="Dashboard" subtitulo={`Operación consolidada · ${mes}`} />

      {error && (
        <Card className="mb-6 border-[#F5B8B1] bg-[#FCE1DE]">
          <CardContent className="px-6 text-sm text-[#B03A30]">
            No se pudieron cargar las cifras: {error}. Verifica que glucyai esté corriendo.
          </CardContent>
        </Card>
      )}

      {cargando || !datos ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <TarjetaCifra Icono={ClipboardList} valor={datos.clinicasActivas} etiqueta="Clínicas activas" />
            <TarjetaCifra Icono={Users} valor={datos.pacientesTotales} etiqueta="Pacientes totales" />
            <TarjetaCifra Icono={BadgeCheck} valor={datos.vigentes} etiqueta="Licencias vigentes" />
            <TarjetaCifra
              Icono={TriangleAlert}
              valor={datos.porVencer + datos.vencidas}
              etiqueta="Por vencer / vencidas"
              tono="alerta"
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[3fr_2fr]">
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-base font-bold">Pacientes por clínica</CardTitle>
              </CardHeader>
              <CardContent className="px-6">
                {datos.pacientesPorClinica.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Aún no hay clínicas activas con pacientes. Crea una en la sección Clínicas.
                  </p>
                ) : (
                  <BarrasPorClinica datos={datos.pacientesPorClinica} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-base font-bold">Licencias por estado</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 px-6">
                <FilaLicencias etiqueta="Vigentes" valor={datos.vigentes} total={totalLicencias} color="var(--primary)" />
                <FilaLicencias
                  etiqueta="Por vencer (30 días)"
                  valor={datos.porVencer}
                  total={totalLicencias}
                  color="var(--advertencia)"
                />
                <FilaLicencias
                  etiqueta="Vencidas / suspendidas"
                  valor={datos.vencidas}
                  total={totalLicencias}
                  color="var(--alerta)"
                />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  )
}
