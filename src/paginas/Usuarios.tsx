import { useCallback, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/auth/AuthContext'
import { api } from '@/lib/api'
import { nombreCompleto } from '@/lib/formato'
import type { Paginado, Rol, Usuario } from '@/lib/tipos'
import { usePeticion } from '@/lib/usePeticion'
import { Encabezado } from '@/components/panel/Encabezado'
import { InsigniaRol } from '@/components/panel/Insignia'
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
  name: string
  apellidoPaterno: string
  apellidoMaterno: string
  email: string
  telefono: string
  rol: Rol
  password: string
  password_confirmation: string
}

const FORMULARIO_VACIO: Formulario = {
  name: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  email: '',
  telefono: '',
  rol: 'doctor',
  password: '',
  password_confirmation: '',
}

const ETIQUETA_ROL: Record<Rol, string> = {
  admin: 'Administrador',
  doctor: 'Doctor',
  paciente: 'Paciente',
}

/** Valor "todos" del filtro: los Select no aceptan cadena vacia. */
const TODOS = '__todos__'

export function Usuarios() {
  const { sesion } = useAuth()
  const [filtroRol, setFiltroRol] = useState<string>(TODOS)

  const pedir = useCallback(
    () =>
      api.get<Paginado<Usuario>>('/usuarios', {
        porPagina: 100,
        orden: 'name',
        direccion: 'asc',
        rol: filtroRol === TODOS ? undefined : filtroRol,
      }),
    [filtroRol],
  )
  const { datos, cargando, error, refrescar } = usePeticion(pedir)

  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState<Usuario | 'nuevo' | null>(null)
  const [formulario, setFormulario] = useState<Formulario>(FORMULARIO_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<Usuario | null>(null)

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()

    if (!texto) return datos?.data ?? []

    return (datos?.data ?? []).filter((u) =>
      `${u.name} ${u.apellidoPaterno ?? ''} ${u.apellidoMaterno ?? ''} ${u.email} ${u.telefono ?? ''}`
        .toLowerCase()
        .includes(texto),
    )
  }, [datos, busqueda])

  const esYo = (usuario: Usuario) => sesion?.usuario.id === usuario.id

  function abrir(usuario: Usuario | 'nuevo') {
    setEditando(usuario)
    setFormulario(
      usuario === 'nuevo'
        ? FORMULARIO_VACIO
        : {
            name: usuario.name,
            apellidoPaterno: usuario.apellidoPaterno ?? '',
            apellidoMaterno: usuario.apellidoMaterno ?? '',
            email: usuario.email,
            telefono: usuario.telefono ?? '',
            rol: usuario.rol,
            password: '',
            password_confirmation: '',
          },
    )
  }

  async function guardar(evento: FormEvent) {
    evento.preventDefault()

    if (!editando) return

    const creando = editando === 'nuevo'

    if (formulario.password !== formulario.password_confirmation) {
      toast.error('Las contraseñas no coinciden.')
      return
    }

    setGuardando(true)

    // password es obligatoria al crear y opcional al editar
    // (UsuarioController::reglas()); al editar se omite si va vacia.
    const cuerpo: Record<string, unknown> = {
      name: formulario.name.trim(),
      apellidoPaterno: formulario.apellidoPaterno.trim() || null,
      apellidoMaterno: formulario.apellidoMaterno.trim() || null,
      email: formulario.email.trim().toLowerCase(),
      telefono: formulario.telefono.trim() || null,
      rol: formulario.rol,
    }

    if (creando || formulario.password) {
      cuerpo.password = formulario.password
      cuerpo.password_confirmation = formulario.password_confirmation
    }

    try {
      if (creando) {
        await api.post<Usuario>('/usuarios', cuerpo)
        toast.success('Usuario creado')
      } else {
        await api.put<Usuario>(`/usuarios/${editando.id}`, cuerpo)
        toast.success('Cambios guardados')
      }
      setEditando(null)
      refrescar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo guardar el usuario.')
    } finally {
      setGuardando(false)
    }
  }

  async function eliminar() {
    if (!eliminando) return

    try {
      await api.delete(`/usuarios/${eliminando.id}`)
      toast.success(`Usuario «${nombreCompleto(eliminando)}» eliminado`)
      setEliminando(null)
      refrescar()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo eliminar el usuario.')
    }
  }

  const campo = (clave: keyof Formulario) => ({
    value: formulario[clave],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setFormulario((previo) => ({ ...previo, [clave]: e.target.value })),
  })

  const editandome = editando !== null && editando !== 'nuevo' && esYo(editando)

  return (
    <>
      <Encabezado titulo="Usuarios" subtitulo="Cuentas del sistema y el rol que determina su acceso">
        <Select value={filtroRol} onValueChange={(valor) => setFiltroRol(valor ?? TODOS)}>
          <SelectTrigger className="w-44 bg-card" aria-label="Filtrar por rol">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los roles</SelectItem>
            {(Object.keys(ETIQUETA_ROL) as Rol[]).map((rol) => (
              <SelectItem key={rol} value={rol}>
                {ETIQUETA_ROL[rol]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search aria-hidden className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, correo o teléfono…"
            aria-label="Buscar usuarios"
            className="w-64 bg-card pl-9"
          />
        </div>
        <Button onClick={() => abrir('nuevo')}>
          <Plus className="h-4 w-4" aria-hidden /> Nuevo usuario
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
                  <TableHead>Usuario</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Perfil vinculado</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      {busqueda
                        ? `Sin resultados para “${busqueda}”.`
                        : 'No hay usuarios con ese filtro.'}
                    </TableCell>
                  </TableRow>
                )}
                {filtrados.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell>
                      <p className="font-medium">
                        {[usuario.name, usuario.apellidoPaterno, usuario.apellidoMaterno]
                          .filter(Boolean)
                          .join(' ')}
                        {esYo(usuario) && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">(tú)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">#{usuario.id}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <p>{usuario.email}</p>
                      {usuario.telefono && <p className="text-xs">{usuario.telefono}</p>}
                    </TableCell>
                    <TableCell>
                      <InsigniaRol rol={usuario.rol} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {usuario.doctor
                        ? `Doctor${usuario.doctor.clinica ? ` · ${usuario.doctor.clinica.nombre}` : ''}`
                        : usuario.paciente
                          ? 'Paciente'
                          : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => abrir(usuario)}>
                        <Pencil className="h-4 w-4" aria-hidden />
                        <span className="sr-only">Editar {usuario.name}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        disabled={esYo(usuario)}
                        title={esYo(usuario) ? 'No puedes eliminar tu propia cuenta' : undefined}
                        onClick={() => setEliminando(usuario)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                        <span className="sr-only">Eliminar {usuario.name}</span>
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
              {editando === 'nuevo' ? 'Nuevo usuario' : 'Editar usuario'}
            </DialogTitle>
            <DialogDescription>
              El rol define qué secciones del panel puede usar. Los pacientes entran solo por la app
              móvil.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void guardar(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" required {...campo('name')} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
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
            <div className="space-y-2">
              <Label htmlFor="rol">Rol</Label>
              <Select
                value={formulario.rol}
                disabled={editandome}
                onValueChange={(rol) => setFormulario((previo) => ({ ...previo, rol: rol as Rol }))}
              >
                <SelectTrigger id="rol" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ETIQUETA_ROL) as Rol[]).map((rol) => (
                    <SelectItem key={rol} value={rol}>
                      {ETIQUETA_ROL[rol]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editandome && (
                <p className="text-xs text-muted-foreground">No puedes cambiar tu propio rol.</p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="password">
                  {editando === 'nuevo' ? 'Contraseña' : 'Nueva contraseña'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required={editando === 'nuevo'}
                  minLength={8}
                  placeholder={editando === 'nuevo' ? undefined : 'Dejar vacío para no cambiar'}
                  {...campo('password')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password_confirmation">Confirmar contraseña</Label>
                <Input
                  id="password_confirmation"
                  type="password"
                  autoComplete="new-password"
                  required={editando === 'nuevo' || formulario.password !== ''}
                  {...campo('password_confirmation')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditando(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={guardando}>
                {guardando ? 'Guardando…' : 'Guardar usuario'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={eliminando !== null} onOpenChange={(abierto) => !abierto && setEliminando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading">
              ¿Eliminar a «{nombreCompleto(eliminando)}»?
            </AlertDialogTitle>
            <AlertDialogDescription>
              La cuenta pierde acceso de inmediato y sus sesiones dejan de valer. Si tiene perfil de
              doctor o paciente vinculado, ese perfil queda sin cuenta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => void eliminar()}
            >
              Eliminar usuario
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
