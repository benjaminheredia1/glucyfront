import { leerSesion, borrarSesion } from '@/auth/sesion'

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000/api'

export class ErrorApi extends Error {
  readonly status: number

  constructor(status: number, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorApi'
    this.status = status
  }
}

async function pedir<T>(
  metodo: string,
  ruta: string,
  opciones: { cuerpo?: unknown; params?: Record<string, string | number | undefined> } = {},
): Promise<T> {
  const url = new URL(BASE + ruta, window.location.origin)

  for (const [clave, valor] of Object.entries(opciones.params ?? {})) {
    if (valor !== undefined && valor !== '') url.searchParams.set(clave, String(valor))
  }

  const cabeceras: Record<string, string> = { Accept: 'application/json' }
  const sesion = leerSesion()

  if (sesion) cabeceras.Authorization = `Bearer ${sesion.token}`
  if (opciones.cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json'

  const respuesta = await fetch(url, {
    method: metodo,
    headers: cabeceras,
    body: opciones.cuerpo !== undefined ? JSON.stringify(opciones.cuerpo) : undefined,
  })

  if (respuesta.status === 401 && sesion) {
    // El token de Sanctum caduco o fue revocado: la sesion local ya no sirve.
    borrarSesion()
    window.location.assign('/login')
    throw new ErrorApi(401, 'Sesion expirada')
  }

  if (!respuesta.ok) {
    let mensaje = `Error ${respuesta.status}`
    try {
      const json = (await respuesta.json()) as { message?: string }
      if (json.message) mensaje = json.message
    } catch {
      // cuerpo no JSON: se queda el mensaje generico
    }
    throw new ErrorApi(respuesta.status, mensaje)
  }

  if (respuesta.status === 204) return undefined as T

  return (await respuesta.json()) as T
}

export const api = {
  get: <T>(ruta: string, params?: Record<string, string | number | undefined>) =>
    pedir<T>('GET', ruta, { params }),
  post: <T>(ruta: string, cuerpo?: unknown) => pedir<T>('POST', ruta, { cuerpo }),
  put: <T>(ruta: string, cuerpo?: unknown) => pedir<T>('PUT', ruta, { cuerpo }),
  delete: <T>(ruta: string) => pedir<T>('DELETE', ruta),
}
