import { useCallback, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Clinica, Paginado } from '@/lib/tipos'
import { usePeticion } from '@/lib/usePeticion'
import { Encabezado } from '@/components/panel/Encabezado'
import { InsigniaClinica } from '@/components/panel/Insignia'
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

interface Formulario {
  nombre: string
  email: string
  telefono: string
  direccion: string
  nit: string
  estado: Clinica['estado']
}

const FORMULARIO_VACIO: Formulario = {
  nombre: '',
  email: '',
  telefono: '',
  direccion: '',
  nit: '',
  estado: 'activa',
}

export function Clinicas() {
  const pedir = useCallback(() => api.get<Paginado<Clinica>>('/clinicas', { porPagina: 100 }), [])
  const { datos, cargando, error, refrescar } = usePeticion(pedir)

  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<Clinica | 'nueva' | null>(null)
  const [formulario, setFormulario] = useState<Formulario>(FORMULARIO_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<Clinica | null>(null)

  const filtradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    if (!texto) return datos?.data ?? []

    return (datos?.data ?? []).filter((c) =>
      `${c.nombre} ${c.email ?? ''} ${c.nit ?? ''}`.toLowerCase().includes(texto),
    )
  }, [datos, busqueda])

  function abrir(clinica: Clinica | 'nueva') {
    setEditando(clinica)
    setFormulario(
      clinica === 'nueva'
        ? FORMULARIO_VACIO
        : {
            nombre: clinica.nombre,
            email: clinica.email ?? '',
            telefono: clinica.telefono ?? '',
            direccion: clinica.direccion ?? '',
            nit: clinica.nit ?? '',
            estado: clinica.estado,
          },
    )
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault()

    if (!editando) return

    setGuardando(true)

    // direccion y telefono son obligatorios en ClinicaController::reglas():
    // van siempre como texto (null no pasa la regla `string`). El responsable
    // (usuarioId) lo resuelve el backend con el admin que crea la clinica.
    const cuerpo = {
      nombre: formulario.nombre.trim(),
      email: formulario.email.trim() || null,
      telefono: formulario.telefono.trim(),
      direccion: formulario.direccion.trim(),
      nit: formulario.nit.trim() || null,
      estado: formulario.estado,
    }

    try {
      if (editando === 'nueva') {
        await api.post<Clinica>('/clinicas', cuerpo)
        toast.success('Clínica creada')
      } else {
        await api.put<Clinica>(`/clinicas/${editando.id}`, cuerpo)
        toast.success('Cambios guardados')
      }
      setEditando(null)
      refrescar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar la clínica.')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!eliminando) return

    try {
      await api.delete(`/clinicas/${eliminando.id}`)
      toast.success(`Clínica «${eliminando.nombre}» eliminada`)
      setEliminando(null)
      refrescar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar la clínica.')
    }
  }

  const campo = (clave: keyof Formulario) => ({
    value: formulario[clave],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormulario((previo) => ({ ...previo, [clave]: e.target.value })),
  })

  return (
    <>
      <Encabezado titulo="Clínicas" subtitulo="Instituciones con convenio y su estado de facturación">
        <div className="relative">
          <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, correo o NIT…"
            aria-label="Buscar clínicas"
            className="w-64 bg-card pl-9"
          />
        </div>
        <Button onClick={() => abrir('nueva')}>
          <Plus className="h-4 w-4" aria-hidden /> Nueva clínica
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
                  <TableHead>Clínica</TableHead>
                  <TableHead>NIT</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      {busqueda
                        ? `Sin resultados para “${busqueda}”.`
                        : 'Aún no hay clínicas. Crea la primera con «Nueva clínica».'}
                    </TableCell>
                  </TableRow>
                )}
                {filtradas.map((clinica) => (
                  <TableRow key={clinica.id}>
                    <TableCell>
                      <p className="font-medium">{clinica.nombre}</p>
                      {clinica.direccion && (
                        <p className="text-xs text-muted-foreground">{clinica.direccion}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{clinica.nit ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <p>{clinica.email ?? '—'}</p>
                      {clinica.telefono && <p className="text-xs">{clinica.telefono}</p>}
                    </TableCell>
                    <TableCell>
                      <InsigniaClinica estado={clinica.estado} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => abrir(clinica)}>
                        <Pencil className="h-4 w-4" aria-hidden />
                        <span className="sr-only">Editar {clinica.nombre}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setEliminando(clinica)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        <span className="sr-only">Eliminar {clinica.nombre}</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={editando !== null} onOpenChange={(abierto) => !abierto && setEditando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editando === 'nueva' ? 'Nueva clínica' : 'Editar clínica'}
            </DialogTitle>
            <DialogDescription>
              El estado controla el acceso de sus doctores y pacientes.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void guardar(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" required {...campo('nombre')} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input id="email" type="email" {...campo('email')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" required {...campo('telefono')} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nit">NIT</Label>
                <Input id="nit" {...campo('nit')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={formulario.estado}
                  onValueChange={(estado) =>
                    setFormulario((previo) => ({ ...previo, estado: estado as Clinica['estado'] }))
                  }
                >
                  <SelectTrigger id="estado" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activa">Activa</SelectItem>
                    <SelectItem value="pago_pendiente">Pago pendiente</SelectItem>
                    <SelectItem value="suspendida">Suspendida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input id="direccion" required {...campo('direccion')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar clínica'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={eliminando !== null} onOpenChange={(abierto) => !abierto && setEliminando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">
              ¿Eliminar «{eliminando?.nombre}»?
            </AlertDialogTitle>
            <AlertDialogDescription>
              La clínica deja de aparecer en el panel y sus licencias quedan sin institución. Sus
              datos se conservan en el historial de auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void eliminar()}
            >
              Eliminar clínica
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
