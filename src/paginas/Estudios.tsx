import { useCallback, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Eye, FileText, Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { EnlaceArchivo, EstadoEstudio, EstudioMedico, Paciente, Paginado, TipoEstudio } from '@/lib/tipos'
import { fechaCorta, nombreCompleto } from '@/lib/formato'
import { usePeticion } from '@/lib/usePeticion'
import { Encabezado } from '@/components/panel/Encabezado'
import { InsigniaEstudio } from '@/components/panel/Insignia'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type FiltroEstado = EstadoEstudio | 'todos'

const OPCIONES_FILTRO: { valor: FiltroEstado; etiqueta: string }[] = [
  { valor: 'pendiente', etiqueta: 'Pendientes' },
  { valor: 'en_revision', etiqueta: 'En revisión' },
  { valor: 'aprobado', etiqueta: 'Aprobados' },
  { valor: 'rechazado', etiqueta: 'Rechazados' },
  { valor: 'todos', etiqueta: 'Todos' },
]

const ETIQUETA_ORIGEN: Record<EstudioMedico['origen'], string> = {
  carga: 'Carga del paciente',
  laboratorio: 'Laboratorio',
}

function valorConUnidad(estudio: EstudioMedico): string {
  if (estudio.valor == null) return '—'

  const unidad = estudio.unidad ?? estudio.tipo_estudio?.unidad ?? ''

  return `${estudio.valor} ${unidad}`.trim()
}

/** Fuera del rango de referencia del tipo de estudio, si lo hay. */
function fueraDeRango(estudio: EstudioMedico): boolean {
  const { valor, tipo_estudio: tipoEstudio } = estudio

  if (valor == null || !tipoEstudio) return false

  return (
    (tipoEstudio.rangoMin != null && valor < tipoEstudio.rangoMin) ||
    (tipoEstudio.rangoMax != null && valor > tipoEstudio.rangoMax)
  )
}

async function cargar(filtro: FiltroEstado) {
  const [estudios, pacientes, tipos] = await Promise.all([
    api.get<Paginado<EstudioMedico>>('/estudios-medicos', {
      porPagina: 100,
      estado: filtro === 'todos' ? undefined : filtro,
      orden: 'created_at',
      direccion: 'asc',
    }),
    api.get<Paginado<Paciente>>('/pacientes', { porPagina: 100 }),
    api.get<Paginado<TipoEstudio>>('/tipo-estudios', { porPagina: 100 }),
  ])

  return { estudios: estudios.data, pacientes: pacientes.data, tipos: tipos.data }
}

interface Formulario {
  pacienteId: string
  tipoEstudioId: string
  fecha: string
  valor: string
  unidad: string
  descripcion: string
  origen: EstudioMedico['origen']
}

const FORMULARIO_VACIO: Formulario = {
  pacienteId: '',
  tipoEstudioId: '',
  fecha: new Date().toISOString().slice(0, 10),
  valor: '',
  unidad: '',
  descripcion: '',
  origen: 'carga',
}

export function Estudios() {
  const [filtro, setFiltro] = useState<FiltroEstado>('pendiente')

  const pedir = useCallback(() => cargar(filtro), [filtro])
  const { datos, cargando, error, refrescar } = usePeticion(pedir)

  const [busqueda, setBusqueda] = useState('')
  const [aprobando, setAprobando] = useState<EstudioMedico | null>(null)
  const [rechazando, setRechazando] = useState<EstudioMedico | null>(null)
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [editando, setEditando] = useState<EstudioMedico | 'nuevo' | null>(null)
  const [formulario, setFormulario] = useState<Formulario>(FORMULARIO_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<EstudioMedico | null>(null)

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    if (!texto) return datos?.estudios ?? []

    return (datos?.estudios ?? []).filter((e) =>
      `${nombreCompleto(e.paciente?.usuario)} ${e.tipo_estudio?.nombre ?? ''} ${e.descripcion ?? ''}`
        .toLowerCase()
        .includes(texto),
    )
  }, [datos, busqueda])

  async function validar(estudio: EstudioMedico, estado: EstadoEstudio, motivoRechazo?: string) {
    setEnviando(true)

    try {
      await api.post(`/estudios-medicos/${estudio.id}/validar`, {
        estado,
        motivoRechazo: estado === 'rechazado' ? motivoRechazo : undefined,
      })

      const nombre = estudio.tipo_estudio?.nombre ?? `Estudio #${estudio.id}`
      toast.success(
        estado === 'aprobado'
          ? `${nombre} aprobado`
          : estado === 'rechazado'
            ? `${nombre} rechazado`
            : `${nombre} marcado en revisión`,
      )
      setAprobando(null)
      setRechazando(null)
      setMotivo('')
      refrescar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo actualizar el estudio.')
    } finally {
      setEnviando(false)
    }
  }

  function enviarRechazo(evento: FormEvent) {
    evento.preventDefault()

    if (!rechazando || !motivo.trim()) return

    void validar(rechazando, 'rechazado', motivo.trim())
  }

  function abrir(estudio: EstudioMedico | 'nuevo') {
    setEditando(estudio)
    setFormulario(
      estudio === 'nuevo'
        ? FORMULARIO_VACIO
        : {
            pacienteId: String(estudio.pacienteId),
            tipoEstudioId: String(estudio.tipoEstudioId),
            fecha: estudio.fecha.slice(0, 10),
            valor: estudio.valor != null ? String(estudio.valor) : '',
            unidad: estudio.unidad ?? '',
            descripcion: estudio.descripcion ?? '',
            origen: estudio.origen,
          },
    )
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault()

    if (!editando) return

    setGuardando(true)

    const cuerpo = {
      pacienteId: Number(formulario.pacienteId),
      tipoEstudioId: Number(formulario.tipoEstudioId),
      fecha: formulario.fecha,
      valor: formulario.valor === '' ? null : Number(formulario.valor),
      unidad: formulario.unidad.trim() || null,
      descripcion: formulario.descripcion.trim() || null,
      origen: formulario.origen,
    }

    try {
      if (editando === 'nuevo') {
        await api.post<EstudioMedico>('/estudios-medicos', cuerpo)
        toast.success('Estudio registrado (queda pendiente de validación)')
      } else {
        await api.put<EstudioMedico>(`/estudios-medicos/${editando.id}`, cuerpo)
        toast.success('Cambios guardados')
      }
      setEditando(null)
      refrescar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el estudio.')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!eliminando) return

    try {
      await api.delete(`/estudios-medicos/${eliminando.id}`)
      toast.success('Estudio eliminado')
      setEliminando(null)
      refrescar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar el estudio.')
    }
  }

  const campo = (clave: keyof Formulario) => ({
    value: formulario[clave],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormulario((previo) => ({ ...previo, [clave]: e.target.value })),
  })

  async function verArchivo(estudio: EstudioMedico) {
    if (estudio.archivoId == null) return

    // La pestana se abre antes del await: los navegadores bloquean window.open
    // fuera del gesto del usuario.
    const pestana = window.open('', '_blank')

    try {
      const enlace = await api.post<EnlaceArchivo>(`/archivos/${estudio.archivoId}/enlace`)

      if (pestana) pestana.location.href = enlace.url
      else window.open(enlace.url, '_blank')
    } catch (e) {
      pestana?.close()
      toast.error(e instanceof Error ? e.message : 'No se pudo abrir el archivo.')
    }
  }

  return (
    <>
      <Encabezado titulo="Estudios" subtitulo="Estudios médicos subidos por pacientes, pendientes de validación">
        <div className="relative">
          <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por paciente o tipo…"
            aria-label="Buscar estudios por paciente o tipo"
            className="w-64 bg-card pl-9"
          />
        </div>
        <Select value={filtro} onValueChange={(valor) => setFiltro(valor as FiltroEstado)}>
          <SelectTrigger className="w-40 bg-card" aria-label="Filtrar por estado">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPCIONES_FILTRO.map((opcion) => (
              <SelectItem key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => abrir('nuevo')} disabled={cargando}>
          <Plus className="h-4 w-4" aria-hidden /> Nuevo estudio
        </Button>
      </Encabezado>

      {error && <p className="mb-4 text-sm text-destructive">No se pudo cargar el listado: {error}</p>}

      {cargando ? (
        <Skeleton className="h-80 rounded-xl" />
      ) : (
        <Card className="overflow-hidden py-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Estudio</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-56 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      {busqueda
                        ? `Sin resultados para “${busqueda}”.`
                        : filtro === 'pendiente'
                          ? 'No hay estudios pendientes de revisión.'
                          : 'No hay estudios con este estado.'}
                    </TableCell>
                  </TableRow>
                )}
                {filtrados.map((estudio) => (
                  <TableRow key={estudio.id}>
                    <TableCell>
                      <p className="font-medium">{nombreCompleto(estudio.paciente?.usuario)}</p>
                      {estudio.paciente?.clinica?.nombre && (
                        <p className="text-xs text-muted-foreground">{estudio.paciente.clinica.nombre}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p>{estudio.tipo_estudio?.nombre ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">
                        Intento {estudio.intento}
                        {estudio.descripcion ? ` · ${estudio.descripcion}` : ''}
                      </p>
                      {estudio.estado === 'rechazado' && estudio.motivoRechazo && (
                        <p className="text-xs text-destructive">Motivo: {estudio.motivoRechazo}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fechaCorta(estudio.fecha)}</TableCell>
                    <TableCell className={fueraDeRango(estudio) ? 'font-medium text-destructive' : ''}>
                      {valorConUnidad(estudio)}
                      {fueraDeRango(estudio) && (
                        <span className="sr-only"> (fuera del rango de referencia)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{ETIQUETA_ORIGEN[estudio.origen]}</TableCell>
                    <TableCell>
                      <InsigniaEstudio estado={estudio.estado} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={estudio.archivoId == null}
                          title={estudio.archivoId == null ? 'Sin archivo adjunto' : 'Ver archivo'}
                          onClick={() => void verArchivo(estudio)}
                        >
                          <FileText className="h-4 w-4" aria-hidden />
                          <span className="sr-only">Ver archivo</span>
                        </Button>
                        {estudio.estado !== 'en_revision' && estudio.estado !== 'aprobado' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Marcar en revisión"
                            disabled={enviando}
                            onClick={() => void validar(estudio, 'en_revision')}
                          >
                            <Eye className="h-4 w-4" aria-hidden />
                            <span className="sr-only">Marcar en revisión</span>
                          </Button>
                        )}
                        {estudio.estado !== 'aprobado' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Aprobar"
                            className="text-[#0A6E5C] hover:text-[#0A6E5C]"
                            onClick={() => setAprobando(estudio)}
                          >
                            <Check className="h-4 w-4" aria-hidden />
                            <span className="sr-only">Aprobar</span>
                          </Button>
                        )}
                        {estudio.estado !== 'rechazado' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Rechazar"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setMotivo('')
                              setRechazando(estudio)
                            }}
                          >
                            <X className="h-4 w-4" aria-hidden />
                            <span className="sr-only">Rechazar</span>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" title="Editar" onClick={() => abrir(estudio)}>
                          <Pencil className="h-4 w-4" aria-hidden />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Eliminar"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setEliminando(estudio)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <AlertDialog open={aprobando !== null} onOpenChange={(abierto) => !abierto && setAprobando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">
              ¿Aprobar {aprobando?.tipo_estudio?.nombre ?? 'este estudio'}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Paciente: {nombreCompleto(aprobando?.paciente?.usuario)}. El estudio cuenta como válido
              para la elegibilidad del paciente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={enviando}
              onClick={() => aprobando && void validar(aprobando, 'aprobado')}
            >
              {enviando ? 'Aprobando…' : 'Aprobar estudio'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={rechazando !== null} onOpenChange={(abierto) => !abierto && setRechazando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              Rechazar {rechazando?.tipo_estudio?.nombre ?? 'estudio'}
            </DialogTitle>
            <DialogDescription>
              Paciente: {nombreCompleto(rechazando?.paciente?.usuario)}. El motivo se muestra al
              paciente para que vuelva a subir el estudio.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={enviarRechazo} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo del rechazo</Label>
              <textarea
                id="motivo"
                required
                maxLength={255}
                rows={3}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej.: la imagen no es legible, falta la fecha del laboratorio…"
                className="w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
              />
              <p className="text-xs text-muted-foreground">{motivo.length}/255</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRechazando(null)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={enviando || !motivo.trim()}>
                {enviando ? 'Rechazando…' : 'Rechazar estudio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editando !== null} onOpenChange={(abierto) => !abierto && setEditando(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editando === 'nuevo' ? 'Nuevo estudio' : 'Editar estudio'}
            </DialogTitle>
            <DialogDescription>
              {editando === 'nuevo'
                ? 'El estudio se registra como pendiente; el archivo lo adjunta el paciente desde la app.'
                : 'El veredicto (aprobado / rechazado) se cambia con las acciones de la tabla, no aquí.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void guardar(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pacienteId">Paciente</Label>
              <Select
                value={formulario.pacienteId}
                onValueChange={(pacienteId) =>
                  setFormulario((previo) => ({ ...previo, pacienteId: pacienteId ?? '' }))
                }
              >
                <SelectTrigger id="pacienteId" className="w-full">
                  <SelectValue placeholder="Elige un paciente" />
                </SelectTrigger>
                <SelectContent>
                  {(datos?.pacientes ?? []).map((paciente) => (
                    <SelectItem key={paciente.id} value={String(paciente.id)}>
                      {nombreCompleto(paciente.usuario)}
                      {paciente.clinica?.nombre ? ` · ${paciente.clinica.nombre}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tipoEstudioId">Tipo de estudio</Label>
                <Select
                  value={formulario.tipoEstudioId}
                  onValueChange={(tipoEstudioId) => {
                    const tipo = datos?.tipos.find((t) => String(t.id) === tipoEstudioId)
                    setFormulario((previo) => ({
                      ...previo,
                      tipoEstudioId: tipoEstudioId ?? '',
                      unidad: previo.unidad || (tipo?.unidad ?? ''),
                    }))
                  }}
                >
                  <SelectTrigger id="tipoEstudioId" className="w-full">
                    <SelectValue placeholder="Elige un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {(datos?.tipos ?? []).map((tipo) => (
                      <SelectItem key={tipo.id} value={String(tipo.id)}>
                        {tipo.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha del estudio</Label>
                <Input id="fecha" type="date" required {...campo('fecha')} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="valor">Valor</Label>
                <Input id="valor" type="number" step="any" {...campo('valor')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unidad">Unidad</Label>
                <Input id="unidad" placeholder="%, mg/dL…" {...campo('unidad')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="origen">Origen</Label>
                <Select
                  value={formulario.origen}
                  onValueChange={(origen) =>
                    setFormulario((previo) => ({
                      ...previo,
                      origen: (origen as EstudioMedico['origen'] | null) ?? 'carga',
                    }))
                  }
                >
                  <SelectTrigger id="origen" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="carga">Carga del paciente</SelectItem>
                    <SelectItem value="laboratorio">Laboratorio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input id="descripcion" maxLength={255} {...campo('descripcion')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={guardando || !formulario.pacienteId || !formulario.tipoEstudioId}
              >
                {guardando ? 'Guardando…' : 'Guardar estudio'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={eliminando !== null} onOpenChange={(abierto) => !abierto && setEliminando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">
              ¿Eliminar {eliminando?.tipo_estudio?.nombre ?? 'este estudio'} de{' '}
              {nombreCompleto(eliminando?.paciente?.usuario)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              El estudio deja de contar para la elegibilidad del paciente. Se conserva en el historial
              de auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void eliminar()}
            >
              Eliminar estudio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
