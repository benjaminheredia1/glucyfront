import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Login() {
  const { sesion, cargando, error, entrar } = useAuth()
  const ubicacion = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  if (sesion) {
    const destino =
      sesion.usuario.rol === 'paciente'
        ? '/sin-acceso'
        : ((ubicacion.state as { desde?: string } | null)?.desde ?? '/dashboard')

    return <Navigate to={destino} replace />
  }

  function enviar(evento: FormEvent) {
    evento.preventDefault()
    void entrar(email, password)
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-sidebar p-6">
      <Card className="w-full max-w-sm border-none shadow-xl">
        <CardContent className="flex flex-col items-center gap-6 px-8 py-10 text-center">
          <img src="/marca/lockup-claro.svg" alt="Glucy AI" className="h-10" />

          <div>
            <h1 className="font-heading text-xl font-bold">Panel de gestión</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Clínicas, pacientes y licencias en un solo lugar.
            </p>
          </div>

          <form onSubmit={enviar} className="flex w-full flex-col gap-4 text-left">
            <div className="grid gap-2">
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-[#FCE1DE] p-4 text-xs text-[#B03A30]" role="alert">
                <p className="font-medium">No se pudo iniciar sesión.</p>
                <p className="mt-1">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={cargando}>
              {cargando ? 'Verificando…' : 'Iniciar sesión'}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground">
            Acceso para administradores y médicos. El acceso depende de tu rol.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
