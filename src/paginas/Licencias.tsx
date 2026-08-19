import { useCallback, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Ban, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { estadoLicencia, fechaCorta } from '@/lib/formato'
import type { Clinica, Licencia, Paginado, Plan } from '@/lib/tipos'
import { usePeticion } from '@/lib/usePeticion'
import { useAuth } from '@/auth/AuthContext'
import { Encabezado } from '@/components/panel/Encabezado'
import { InsigniaLicencia } from '@/components/panel/Insignia'
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

async function cargar(esAdmin: boolean) {
  // Los catalogos de clinicas y planes solo hacen falta para el formulario.
  const [licencias, clinicas, planes] = await Promise.all([
    api.get<Paginado<Licencia>>('/licencias', { porPagina: 100 }),
    esAdmin ? api.get<Paginado<Clinica>>('/clinicas', { porPagina: 100 }) : Promise.resolve(null),
    esAdmin ? api.get<Paginado<Plan>>('/planes', { porPagina: 100 }) : Promise.resolve(null),
  ])

  return { licencias: licencias.data, clinicas: clinicas?.data ?? [], planes: planes?.data ?? [] }
}

const SIN_PLAN = 'ninguno'

interface Formulario {
  codigo: string
  nombre: string
  clinicaId: string
  planId: string
  cantidad: string
  fecha_expiracion: string
  descuento: string
  estado: Licencia['estado']
}

const FORMULARIO_VACIO: Formulario = {
  codigo: '',
  nombre: '',
  clinicaId: '',
  planId: SIN_PLAN,
  cantidad: '10',
  fecha_expiracion: '',
  descuento: '0',
  estado: 'activa',
}

const ETIQUETA_ESTADO: Record<Licencia['estado'], string> = {
  activa: 'Activa',
  inactiva: 'Inactiva',
  suspendida: 'Suspendida',
  vencida: 'Vencida',
}

function aFechaInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : ''
}

export function Licencias() {
  const { sesion } = useAuth()
  const esAdmin = sesion?.usuario.rol === 'admin'

  const pedir = useCallback(() => cargar(esAdmin), [esAdmin])
  const { datos, cargando, error, refrescar } = usePeticion(pedir)

  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<Licencia | 'nueva' | null>(null)
  const [formulario, setFormulario] = useState<Formulario>(FORMULARIO_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [suspendiendo, setSuspendiendo] = useState<Licencia | null>(null)
  const [eliminando, setEliminando] = useState<Licencia | null>(null)

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    const lista = datos?.licencias ?? []

    if (!texto) return lista

    return lista.filter((l) =>
      `${l.codigo} ${l.nombre ?? ''} ${l.clinica?.nombre ?? ''}`.toLowerCase().includes(texto),
    )
  }, [datos, busqueda])

  function abrir(licencia: Licencia | 'nueva') {
    setEditando(licencia)
    setFormulario(
      licencia === 'nueva'
        ? { ...FORMULARIO_VACIO, clinicaId: datos?.clinicas[0] ? String(datos.clinicas[0].id) : '' }
        : {
            codigo: licencia.codigo,
            nombre: licencia.nombre ?? '',
            clinicaId: licencia.clinicaId != null ? String(licencia.clinicaId) : '',
            planId: licencia.planId != null ? String(licencia.planId) : SIN_PLAN,
            cantidad: String(licencia.cantidad),
            fecha_expiracion: aFechaInput(licencia.fecha_expiracion),
            descuento: licencia.descuento != null ? String(licencia.descuento) : '0',
            estado: licencia.estado,
          },
    )
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault()

    if (!editando) return

    setGuardando(true)

    const cuerpo = {
      codigo: formulario.codigo.trim(),
      nombre: formulario.nombre.trim(),
      clinicaId: Number(formulario.clinicaId),
      planId: formulario.planId === SIN_PLAN ? null : Number(formulario.planId),
      cantidad: Number(formulario.cantidad),
      fecha_expiracion: formulario.fecha_expiracion,
      descuento: Number(formulario.descuento || 0),
      estado: formulario.estado,
    }

    try {
      if (editando === 'nueva') {
        await api.post<Licencia>('/licencias', cuerpo)
        toast.success(`Licencia ${cuerpo.codigo} creada`)
      } else {
        await api.put<Licencia>(`/licencias/${editando.id}`, cuerpo)
        toast.success('Cambios guardados')
      }
      setEditando(null)
      refrescar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar la licencia.')
    } finally {
      setGuardando(false)
    }
  }

  // El endpoint alterna: suspendida -> activa, cualquier otro -> suspendida.
  async function alternarSuspension() {
    if (!suspendiendo) return

    const reactivar = suspendiendo.estado === 'suspendida'

    try {
      await api.post(`/licencias/${suspendiendo.id}/suspender`)
      toast.success(`Licencia ${suspendiendo.codigo} ${reactivar ? 'reactivada' : 'suspendida'}`)
      setSuspendiendo(null)
      refrescar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cambiar el estado de la licencia.')
    }
  }

  async function eliminar() {
    if (!eliminando) return

    try {
      await api.delete(`/licencias/${eliminando.id}`)
      toast.success(`Licencia ${eliminando.codigo} eliminada`)
      setEliminando(null)
      refrescar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar la licencia.')
    }
  }

  const campo = (clave: keyof Formulario) => ({
    value: formulario[clave],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormulario((previo) => ({ ...previo, [clave]: e.target.value })),
  })

  const reactivar = suspendiendo?.estado === 'suspendida'

  return (
    <>
      <Encabezado titulo="Licencias" subtitulo="Cupos contratados por clínica y su vigencia">
        <div className="relative">
          <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por código o clínica…"
            aria-label="Buscar licencias"
            className="w-64 bg-card pl-9"
          />
        </div>
        {esAdmin && (
          <Button onClick={() => abrir('nueva')} disabled={cargando}>
            <Plus className="h-4 w-4" aria-hidden /> Nueva licencia
          </Button>
        )}
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
                  <TableHead>Código</TableHead>
                  <TableHead>Clínica</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Cupos</TableHead>
                  <TableHead>Descuento</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-32 text-right">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      {busqueda
                        ? `Sin resultados para “${busqueda}”.`
                        : esAdmin
                          ? 'Aún no hay licencias. Crea la primera con «Nueva licencia».'
                          : 'Aún no hay licencias emitidas.'}
                    </TableCell>
                  </TableRow>
                )}
                {filtradas.map((licencia) => {
                  const estado = estadoLicencia(licencia)

                  return (
                    <TableRow key={licencia.id}>
                      <TableCell>
                        <p className="font-medium">{licencia.codigo}</p>
                        {licencia.nombre && <p className="text-xs text-muted-foreground">{licencia.nombre}</p>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{licencia.clinica?.nombre ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{licencia.plan?.nombre ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {licencia.usadas} / {licencia.cantidad}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {licencia.descuento != null && licencia.descuento > 0 ? `${licencia.descuento} %` : '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fechaCorta(licencia.fecha_expiracion)}
                      </TableCell>
                      <TableCell>
                        <InsigniaLicencia estado={estado} />
                      </TableCell>
                      <TableCell className="text-right">
                        {esAdmin && (
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" title="Editar" onClick={() => abrir(licencia)}>
                              <Pencil className="h-4 w-4" aria-hidden />
                              <span className="sr-only">Editar licencia {licencia.codigo}</span>
                            </Button>
                            {licencia.estado === 'suspendida' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Reactivar"
                                onClick={() => setSuspendiendo(licencia)}
                              >
                                <RotateCcw className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Reactivar licencia {licencia.codigo}</span>
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Suspender"
                                className="text-[#9A6A1B] hover:text-[#9A6A1B]"
                                onClick={() => setSuspendiendo(licencia)}
                              >
                                <Ban className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Suspender licencia {licencia.codigo}</span>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Eliminar"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setEliminando(licencia)}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                              <span className="sr-only">Eliminar licencia {licencia.codigo}</span>
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={editando !== null} onOpenChange={(abierto) => !abierto && setEditando(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editando === 'nueva' ? 'Nueva licencia' : `Editar licencia ${editando?.codigo ?? ''}`}
            </DialogTitle>
            <DialogDescription>
              La cantidad son los cupos contratados por la clínica; «usadas» lo lleva el backend con las
              asignaciones.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void guardar(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código</Label>
                <Input id="codigo" required placeholder="LIC-2026-001" {...campo('codigo')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" required placeholder="Plan anual clínica" {...campo('nombre')} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clinicaId">Clínica</Label>
                <Select
                  value={formulario.clinicaId}
                  onValueChange={(clinicaId) =>
                    setFormulario((previo) => ({ ...previo, clinicaId: clinicaId ?? '' }))
                  }
                >
                  <SelectTrigger id="clinicaId" className="w-full">
                    <SelectValue placeholder="Elige una clínica" />
                  </SelectTrigger>
                  <SelectContent>
                    {(datos?.clinicas ?? []).map((clinica) => (
                      <SelectItem key={clinica.id} value={String(clinica.id)}>
                        {clinica.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="planId">Plan</Label>
                <Select
                  value={formulario.planId}
                  onValueChange={(planId) => setFormulario((previo) => ({ ...previo, planId: planId ?? SIN_PLAN }))}
                >
                  <SelectTrigger id="planId" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_PLAN}>Sin plan</SelectItem>
                    {(datos?.planes ?? []).map((plan) => (
                      <SelectItem key={plan.id} value={String(plan.id)}>
                        {plan.nombre}
                        {plan.periodicidad ? ` · ${plan.periodicidad}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cantidad">Cupos</Label>
                <Input
                  id="cantidad"
                  type="number"
                  min={editando !== 'nueva' && editando ? Math.max(editando.usadas, 1) : 1}
                  step="1"
                  required
                  {...campo('cantidad')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_expiracion">Vence</Label>
                <Input id="fecha_expiracion" type="date" required {...campo('fecha_expiracion')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descuento">Descuento %</Label>
                <Input id="descuento" type="number" min="0" max="100" step="0.5" required {...campo('descuento')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={formulario.estado}
                onValueChange={(estado) =>
                  setFormulario((previo) => ({ ...previo, estado: (estado as Licencia['estado'] | null) ?? 'activa' }))
                }
              >
                <SelectTrigger id="estado" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ETIQUETA_ESTADO) as Licencia['estado'][]).map((estado) => (
                    <SelectItem key={estado} value={estado}>
                      {ETIQUETA_ESTADO[estado]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando || !formulario.clinicaId}>
                {guardando ? 'Guardando…' : 'Guardar licencia'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={suspendiendo !== null} onOpenChange={(abierto) => !abierto && setSuspendiendo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">
              ¿{reactivar ? 'Reactivar' : 'Suspender'} la licencia {suspendiendo?.codigo}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {reactivar
                ? 'Los usuarios asignados recuperan el acceso de inmediato.'
                : 'Los usuarios asignados a esta licencia pierden acceso hasta que se reactive. Los datos clínicos no se tocan.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={reactivar ? undefined : 'bg-destructive text-white hover:bg-destructive/90'}
              onClick={() => void alternarSuspension()}
            >
              {reactivar ? 'Reactivar licencia' : 'Suspender licencia'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={eliminando !== null} onOpenChange={(abierto) => !abierto && setEliminando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">¿Eliminar la licencia {eliminando?.codigo}?</AlertDialogTitle>
            <AlertDialogDescription>
              La licencia deja de aparecer en el panel y sus cupos ya no cuentan. Se conserva en el
              historial de auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void eliminar()}
            >
              Eliminar licencia
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
