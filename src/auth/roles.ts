import type { Rol } from '@/lib/tipos'

export type Seccion = 'dashboard' | 'clinicas' | 'pacientes' | 'estudios' | 'licencias'

// El backend re-verifica cada peticion con Alcance; esto solo decide que
// pantallas se ofrecen. Un rol paciente no opera el panel: usa la app movil.
const PERMISOS: Record<Rol, Seccion[]> = {
  admin: ['dashboard', 'clinicas', 'pacientes', 'estudios', 'licencias'],
  doctor: ['dashboard', 'pacientes', 'estudios'],
  paciente: [],
}

export function puedeVer(rol: Rol, seccion: Seccion): boolean {
  return PERMISOS[rol].includes(seccion)
}

export function seccionesDe(rol: Rol): Seccion[] {
  return PERMISOS[rol]
}
