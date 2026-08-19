import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function SinAcceso() {
  const { sesion, salir } = useAuth()

  return (
    <div className="flex min-h-svh items-center justify-center bg-sidebar p-6">
      <Card className="w-full max-w-sm border-none shadow-xl">
        <CardContent className="flex flex-col items-center gap-5 px-8 py-10 text-center">
          <img src="/marca/isotipo-claro.svg" alt="" className="h-12 w-12" />
          <div>
            <h1 className="font-heading text-xl font-bold">Este panel no es para tu cuenta</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {sesion?.usuario.rol === 'paciente'
                ? 'Tu cuenta es de paciente: tu seguimiento vive en la app móvil de Glucy AI.'
                : 'Tu rol no tiene secciones asignadas en este panel. Si crees que es un error, contacta al administrador.'}
            </p>
          </div>
          <Button variant="outline" onClick={() => void salir()}>
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
