import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Peticion GET con estado de carga y recarga manual. `pedir` debe ser estable
 * o venir de useCallback; se re-ejecuta cuando cambia.
 */
export function usePeticion<T>(pedir: () => Promise<T>) {
  const [datos, setDatos] = useState<T | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recarga, setRecarga] = useState(0)
  const generacion = useRef(0)

  const refrescar = useCallback(() => {
    setCargando(true)
    setError(null)
    setRecarga((n) => n + 1)
  }, [])

  useEffect(() => {
    // Incrementar invalida cualquier respuesta en vuelo de la corrida anterior.
    const actual = ++generacion.current

    pedir()
      .then((resultado) => {
        if (generacion.current === actual) {
          setDatos(resultado)
          setError(null)
        }
      })
      .catch((e: unknown) => {
        if (generacion.current === actual) {
          setError(e instanceof Error ? e.message : 'Error al cargar los datos.')
        }
      })
      .finally(() => {
        if (generacion.current === actual) setCargando(false)
      })
  }, [pedir, recarga])

  return { datos, cargando, error, refrescar }
}
