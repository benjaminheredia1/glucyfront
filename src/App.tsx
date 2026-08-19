import { Navigate, Route, Routes } from 'react-router-dom'
import { RequiereRol, RequiereSesion } from '@/auth/Guardas'
import { PanelLayout } from '@/components/panel/PanelLayout'
import { Clinicas } from '@/paginas/Clinicas'
import { Dashboard } from '@/paginas/Dashboard'
import { Estudios } from '@/paginas/Estudios'
import { Licencias } from '@/paginas/Licencias'
import { Login } from '@/paginas/Login'
import { Pacientes } from '@/paginas/Pacientes'
import { SinAcceso } from '@/paginas/SinAcceso'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/sin-acceso" element={<SinAcceso />} />

      <Route
        element={
          <RequiereSesion>
            <PanelLayout />
          </RequiereSesion>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <RequiereRol seccion="dashboard">
              <Dashboard />
            </RequiereRol>
          }
        />
        <Route
          path="/clinicas"
          element={
            <RequiereRol seccion="clinicas">
              <Clinicas />
            </RequiereRol>
          }
        />
        <Route
          path="/pacientes"
          element={
            <RequiereRol seccion="pacientes">
              <Pacientes />
            </RequiereRol>
          }
        />
        <Route
          path="/estudios"
          element={
            <RequiereRol seccion="estudios">
              <Estudios />
            </RequiereRol>
          }
        />
        <Route
          path="/licencias"
          element={
            <RequiereRol seccion="licencias">
              <Licencias />
            </RequiereRol>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
