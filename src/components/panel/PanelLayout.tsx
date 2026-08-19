import { Outlet } from 'react-router-dom'
import { BarraLateral } from '@/components/panel/BarraLateral'

export function PanelLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-sidebar md:flex-row">
      <BarraLateral />
      <main className="min-w-0 flex-1 bg-background p-4 md:m-2 md:rounded-2xl md:p-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
