import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '@/lib/api'
import type { Sesion } from '@/lib/tipos'
import { borrarSesion, guardarSesion, leerSesion } from '@/auth/sesion'

interface ContextoAuth {
  sesion: Sesion | null
  /** true mientras se envian las credenciales a glucyai. */
  cargando: boolean
  error: string | null
  entrar: (email: string, password: string) => Promise<void>
  salir: () => Promise<void>
}

const Contexto = createContext<ContextoAuth | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(() => leerSesion())
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Login local del panel: correo + contrasena -> token de Sanctum + usuario
  // con rol (POST /auth/panel en glucyai). Solo admin y doctor pasan.
  const entrar = useCallback(async (email: string, password: string) => {
    setCargando(true)
    setError(null)

    try {
      const nueva = await api.post<Sesion>('/auth/panel', {
        email: email.trim(),
        password,
        dispositivo: 'glucyfront',
      })
      guardarSesion(nueva)
      setSesion(nueva)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar sesion.')
    } finally {
      setCargando(false)
    }
  }, [])

  const salir = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // El token ya podia estar revocado: la salida local procede igual.
    }
    borrarSesion()
    setSesion(null)
    window.location.assign('/login')
  }, [])

  const valor: ContextoAuth = { sesion, cargando, error, entrar, salir }

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useAuth(): ContextoAuth {
  const contexto = useContext(Contexto)

  if (!contexto) throw new Error('useAuth requiere AuthProvider')

  return contexto
}
