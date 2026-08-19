import type { Sesion } from '@/lib/tipos'

const CLAVE = 'glucy.sesion'

export function leerSesion(): Sesion | null {
  const crudo = localStorage.getItem(CLAVE)

  if (!crudo) return null

  try {
    const sesion = JSON.parse(crudo) as Sesion

    if (!sesion.token || !sesion.usuario?.rol) return null

    return sesion
  } catch {
    return null
  }
}

export function guardarSesion(sesion: Sesion): void {
  localStorage.setItem(CLAVE, JSON.stringify(sesion))
}

export function borrarSesion(): void {
  localStorage.removeItem(CLAVE)
}
