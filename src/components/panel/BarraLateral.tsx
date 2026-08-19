import { NavLink } from 'react-router-dom'
import { ClipboardList, CreditCard, FileCheck2, LayoutGrid, LogOut, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { seccionesDe, type Seccion } from '@/auth/roles'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAVEGACION: { seccion: Seccion; ruta: string; etiqueta: string; Icono: LucideIcon }[] = [
  { seccion: 'dashboard', ruta: '/dashboard', etiqueta: 'Dashboard', Icono: LayoutGrid },
  { seccion: 'clinicas', ruta: '/clinicas', etiqueta: 'Clínicas', Icono: ClipboardList },
  { seccion: 'pacientes', ruta: '/pacientes', etiqueta: 'Pacientes', Icono: Users },
  { seccion: 'estudios', ruta: '/estudios', etiqueta: 'Estudios', Icono: FileCheck2 },
  { seccion: 'licencias', ruta: '/licencias', etiqueta: 'Licencias', Icono: CreditCard },
]

const ETIQUETA_ROL: Record<string, string> = {
  admin: 'Administración',
  doctor: 'Equipo médico',
  paciente: 'Paciente',
}

export function BarraLateral() {
  const { sesion, salir } = useAuth()

  if (!sesion) return null

  const visibles = seccionesDe(sesion.usuario.rol)
  const iniciales = sesion.usuario.name.slice(0, 1).toUpperCase()

  return (
    <aside className="flex shrink-0 flex-row items-center gap-2 bg-sidebar px-4 py-3 text-sidebar-foreground md:min-h-svh md:w-64 md:flex-col md:items-stretch md:gap-0 md:px-4 md:py-6">
      <a href="/dashboard" className="flex items-center gap-2.5 md:px-2">
        <img src="/marca/isotipo-oscuro.svg" alt="" className="h-8 w-8" />
        <span className="font-heading text-lg font-bold text-white">
          Glucy <span className="text-sidebar-primary">AI</span>
        </span>
      </a>

      <nav aria-label="Secciones del panel" className="flex flex-1 flex-row gap-1 overflow-x-auto md:mt-8 md:flex-col md:overflow-visible">
        {NAVEGACION.filter((item) => visibles.includes(item.seccion)).map(({ ruta, etiqueta, Icono }) => (
          <NavLink
            key={ruta}
            to={ruta}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                'outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-sidebar-border'
                  : 'hover:bg-sidebar-accent/60 hover:text-white',
              )
            }
          >
            <Icono className="h-4 w-4 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">{etiqueta}</span>
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-3 border-sidebar-border md:mt-6 md:border-t md:pt-4">
        <span
          aria-hidden
          className="hidden h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent font-heading text-sm font-semibold text-white md:flex"
        >
          {iniciales}
        </span>
        <div className="hidden min-w-0 flex-1 md:block">
          <p className="truncate text-sm font-medium text-white">{sesion.usuario.name}</p>
          <p className="truncate text-xs text-sidebar-foreground/80">
            {ETIQUETA_ROL[sesion.usuario.rol] ?? sesion.usuario.rol}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void salir()}
          title="Cerrar sesión"
          className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          <span className="sr-only">Cerrar sesión</span>
        </Button>
      </div>
    </aside>
  )
}
