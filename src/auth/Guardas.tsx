import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { puedeVer, type Seccion } from '@/auth/roles'

/** Bloquea la ruta si no hay sesion de Sanctum. */
export function RequiereSesion({ children }: { children: ReactNode }) {
  const { sesion, cargando } = useAuth()
  const ubicacion = useLocation()

  if (cargando && !sesion) {
    return (
      <div className="flex min-h-svh items-center justify-center text-muted-foreground">
        Cargando sesion…
      </div>
    )
  }

  if (!sesion) {
    return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />
  }

  return children
}

/** Bloquea la ruta si el rol de la sesion no alcanza para la seccion. */
export function RequiereRol({ seccion, children }: { seccion: Seccion; children: ReactNode }) {
  const { sesion } = useAuth()

  if (!sesion) return <Navigate to="/login" replace />

  if (!puedeVer(sesion.usuario.rol, seccion)) {
    return <Navigate to="/sin-acceso" replace />
  }

  return children
}
