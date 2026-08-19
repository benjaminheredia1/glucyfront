import { useCallback, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { estadoLicencia, fechaCorta, nombreCompleto } from '@/lib/formato'
import type { Clinica, Licencia, Paciente, Paginado } from '@/lib/tipos'
import { usePeticion } from '@/lib/usePeticion'
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

async function cargar() {
  const [pacientes, licencias, clinicas] = await Promise.all([
    api.get<Paginado<Paciente>>('/pacientes', { porPagina: 100 }),
    api.get<Paginado<Licencia>>('/licencias', { porPagina: 100 }),
    api.get<Paginado<Clinica>>('/clinicas', { porPagina: 100 }),
  ])

  return { pacientes: pacientes.data, licencias: licencias.data, clinicas: clinicas.data }
}

/** Valor "sin clinica" del select: los Select no aceptan cadena vacia. */
const SIN_CLINICA = 'ninguna'
const SIN_SEXO = 'sin_especificar'

interface Formulario {
  name: string
  apellidoPaterno: string
  apellidoMaterno: string
  email: string
  telefono: string
  clinicaId: string
  fechaNacimiento: string
  sexo: string
  tipoDiabetes: string
  pesoKg: string
  tallaCm: string
  contactoEmergencia: string
}

const FORMULARIO_VACIO: Formulario = {
  name: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  email: '',
  telefono: '',
  clinicaId: SIN_CLINICA,
  fechaNacimiento: '',
  sexo: SIN_SEXO,
  tipoDiabetes: '',
  pesoKg: '',
  tallaCm: '',
  contactoEmergencia: '',
}

/** Fecha ISO (o datetime) -> valor de <input type="date">. */
function aFechaInput(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : ''
}

export function Pacientes() {
  const pedir = useCallback(() => cargar(), [])
  const { datos, cargando, error, refrescar } = usePeticion(pedir)
  const [busqueda, setBusqueda] = useState('')

  const [editando, setEditando] = useState<Paciente | 'nuevo' | null>(null)
  const [formulario, setFormulario] = useState<Formulario>(FORMULARIO_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<Paciente | null>(null)

  // La licencia visible de un paciente es la de su clinica: es quien paga el
  // cupo (Licencia.clinicaId). Pacientes sin clinica quedan sin licencia.
  const licenciaPorClinica = useMemo(() => {
    const mapa = new Map<number, Licencia>()

    for (const licencia of datos?.licencias ?? []) {
      if (licencia.clinicaId != null && !mapa.has(licencia.clinicaId)) {
        mapa.set(licencia.clinicaId, licencia)
      }
    }

    return mapa
  }, [datos])

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    if (!texto) return datos?.pacientes ?? []

    return (datos?.pacientes ?? []).filter((p) =>
      `${nombreCompleto(p.usuario)} ${p.usuario?.email ?? ''} ${p.clinica?.nombre ?? ''}`
        .toLowerCase()
        .includes(texto),
    )
  }, [datos, busqueda])

  function abrir(paciente: Paciente | 'nuevo') {
    setEditando(paciente)
    setFormulario(
      paciente === 'nuevo'
        ? FORMULARIO_VACIO
        : {
            name: paciente.usuario?.name ?? '',
            apellidoPaterno: paciente.usuario?.apellidoPaterno ?? '',
            apellidoMaterno: paciente.usuario?.apellidoMaterno ?? '',
            email: paciente.usuario?.email ?? '',
            telefono: paciente.usuario?.telefono ?? '',
            clinicaId: paciente.clinicaId != null ? String(paciente.clinicaId) : SIN_CLINICA,
            fechaNacimiento: aFechaInput(paciente.fechaNacimiento),
            sexo: paciente.sexo ?? SIN_SEXO,
            tipoDiabetes: paciente.tipoDiabetes ?? '',
            pesoKg: paciente.pesoKg != null ? String(paciente.pesoKg) : '',
            tallaCm: paciente.tallaCm != null ? String(paciente.tallaCm) : '',
            contactoEmergencia: paciente.contactoEmergencia ?? '',
          },
    )
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault()

    if (!editando) return

    setGuardando(true)

    // PacienteController acepta `usuario` anidado: en alta crea la cuenta
    // (rol paciente, sin contrasena) y en edicion actualiza la ligada.
    const cuerpo = {
      usuario: {
        name: formulario.name.trim(),
        apellidoPaterno: formulario.apellidoPaterno.trim() || null,
        apellidoMaterno: formulario.apellidoMaterno.trim() || null,
        email: formulario.email.trim(),
        telefono: formulario.telefono.trim() || null,
      },
      clinicaId: formulario.clinicaId === SIN_CLINICA ? null : Number(formulario.clinicaId),
      fechaNacimiento: formulario.fechaNacimiento,
      sexo: formulario.sexo === SIN_SEXO ? null : formulario.sexo,
      tipoDiabetes: formulario.tipoDiabetes.trim(),
      pesoKg: formulario.pesoKg === '' ? null : Number(formulario.pesoKg),
      tallaCm: formulario.tallaCm === '' ? null : Number(formulario.tallaCm),
      contactoEmergencia: formulario.contactoEmergencia.trim() || null,
    }

    try {
      if (editando === 'nuevo') {
        await api.post<Paciente>('/pacientes', cuerpo)
        toast.success('Paciente creado')
      } else {
        await api.put<Paciente>(`/pacientes/${editando.id}`, cuerpo)
        toast.success('Cambios guardados')
      }
      setEditando(null)
      refrescar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el paciente.')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!eliminando) return

    try {
      await api.delete(`/pacientes/${eliminando.id}`)
      toast.success(`Paciente ${nombreCompleto(eliminando.usuario)} eliminado`)
      setEliminando(null)
      refrescar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar el paciente.')
    }
  }

  const campo = (clave: keyof Formulario) => ({
    value: formulario[clave],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormulario((previo) => ({ ...previo, [clave]: e.target.value })),
  })

  return (
    <>
      <Encabezado titulo="Pacientes" subtitulo="Listado global con clínica, plan y estado de licencia">
        <div className="relative">
          <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, correo o clínica…"
            aria-label="Buscar pacientes por nombre, correo o clínica"
            className="w-72 bg-card pl-9"
          />
        </div>
        <Button onClick={() => abrir('nuevo')}>
          <Plus className="h-4 w-4" aria-hidden /> Nuevo paciente
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
                  <TableHead>Clínica</TableHead>
                  <TableHead>Diabetes</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Licencia</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      {busqueda
                        ? `Sin resultados para “${busqueda}”. Prueba con otro nombre o clínica.`
                        : 'Aún no hay pacientes. Crea el primero con «Nuevo paciente».'}
                    </TableCell>
                  </TableRow>
                )}
                {filtrados.map((paciente) => {
                  const licencia = paciente.clinicaId != null ? licenciaPorClinica.get(paciente.clinicaId) : undefined

                  return (
                    <TableRow key={paciente.id}>
                      <TableCell>
                        <p className="font-medium">{nombreCompleto(paciente.usuario)}</p>
                        <p className="text-xs text-muted-foreground">
                          {paciente.usuario?.email ?? '—'}
                          {paciente.fechaNacimiento ? ` · ${fechaCorta(paciente.fechaNacimiento)}` : ''}
                        </p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{paciente.clinica?.nombre ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{paciente.tipoDiabetes ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {licencia?.plan?.nombre ?? '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {fechaCorta(licencia?.fecha_expiracion)}
                      </TableCell>
                      <TableCell>
                        {licencia ? (
                          <InsigniaLicencia estado={estadoLicencia(licencia)} />
                        ) : (
                          <span className="text-muted-foreground">Sin licencia</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => abrir(paciente)}>
                          <Pencil className="h-4 w-4" aria-hidden />
                          <span className="sr-only">Editar {nombreCompleto(paciente.usuario)}</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setEliminando(paciente)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                          <span className="sr-only">Eliminar {nombreCompleto(paciente.usuario)}</span>
                        </Button>
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
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {editando === 'nuevo' ? 'Nuevo paciente' : 'Editar paciente'}
            </DialogTitle>
            <DialogDescription>
              {editando === 'nuevo'
                ? 'Se crea la cuenta del paciente con este correo; entra a la app con él, sin contraseña.'
                : 'Los cambios en nombre y correo se aplican a la cuenta del paciente.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void guardar(e)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input id="name" required {...campo('name')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellidoPaterno">Apellido paterno</Label>
                <Input id="apellidoPaterno" {...campo('apellidoPaterno')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellidoMaterno">Apellido materno</Label>
                <Input id="apellidoMaterno" {...campo('apellidoMaterno')} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
                <Input id="email" type="email" required {...campo('email')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input id="telefono" {...campo('telefono')} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="clinicaId">Clínica</Label>
                <Select
                  value={formulario.clinicaId}
                  onValueChange={(clinicaId) => setFormulario((previo) => ({ ...previo, clinicaId: clinicaId ?? SIN_CLINICA }))}
                >
                  <SelectTrigger id="clinicaId" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_CLINICA}>Sin clínica</SelectItem>
                    {(datos?.clinicas ?? []).map((clinica) => (
                      <SelectItem key={clinica.id} value={String(clinica.id)}>
                        {clinica.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaNacimiento">Fecha de nacimiento</Label>
                <Input id="fechaNacimiento" type="date" required {...campo('fechaNacimiento')} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="tipoDiabetes">Tipo de diabetes</Label>
                <Input id="tipoDiabetes" required placeholder="DM1, DM2, gestacional…" {...campo('tipoDiabetes')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sexo">Sexo</Label>
                <Select
                  value={formulario.sexo}
                  onValueChange={(sexo) => setFormulario((previo) => ({ ...previo, sexo: sexo ?? SIN_SEXO }))}
                >
                  <SelectTrigger id="sexo" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_SEXO}>Sin especificar</SelectItem>
                    <SelectItem value="femenino">Femenino</SelectItem>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="pesoKg">Peso (kg)</Label>
                <Input id="pesoKg" type="number" step="0.1" min="1" max="400" {...campo('pesoKg')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tallaCm">Talla (cm)</Label>
                <Input id="tallaCm" type="number" step="1" min="30" max="260" {...campo('tallaCm')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactoEmergencia">Contacto de emergencia</Label>
                <Input id="contactoEmergencia" {...campo('contactoEmergencia')} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar paciente'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={eliminando !== null} onOpenChange={(abierto) => !abierto && setEliminando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">
              ¿Eliminar a {nombreCompleto(eliminando?.usuario)}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              El paciente deja de aparecer en el panel y en la app. Su historial clínico y su cuenta
              se conservan para auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void eliminar()}
            >
              Eliminar paciente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
