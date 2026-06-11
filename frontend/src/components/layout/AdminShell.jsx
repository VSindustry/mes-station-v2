import { Routes, Route } from 'react-router-dom'
import LeaderMyTeam from '../../pages/leader/MyTeam'
import AdminSidebar from './AdminSidebar'
import Topbar from './Topbar'
import useAuthStore from '../../store/authStore'
import DataPurge from "../../pages/admin/DataPurge";

// Admin Pages
import AdminDashboard from '../../pages/admin/Dashboard'
import FloorView from '../../pages/admin/FloorView'
import ManageProjects from '../../pages/admin/ManageProjects'
import MyTeam from '../../pages/admin/MyTeam'
import RegisterLeader from '../../pages/admin/RegisterLeader'
import AdminAddOperator from '../../pages/admin/AddOperator'
import PrintQr from '../../pages/admin/PrintQr'
import Approvals from '../../pages/admin/Approvals'
import Export from '../../pages/admin/Export'
import AuditLog from '../../pages/admin/AuditLog'

// Leader Pages
import LeaderAssignments from '../../pages/leader/Assignments'
import LeaderAddOperator from '../../pages/leader/AddOperator'
import LeaderRegister from '../../pages/leader/Register'

export default function AdminShell() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'mes_admin'

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden', background: '#f0f4ff' }}>
      <AdminSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar />
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <Routes>
            {/* Shared routes */}
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/floor" element={<FloorView />} />
           <Route path="/team" element={isAdmin ? <MyTeam /> : <LeaderMyTeam />} />

            {/* Add operator — admin gets full form, leaders get simplified form */}
            <Route path="/add-operator" element={isAdmin ? <AdminAddOperator /> : <LeaderAddOperator />} />

            {/* Admin only routes */}
            <Route path="/projects" element={<ManageProjects />} />
            <Route path="/register-leader" element={<RegisterLeader />} />
            <Route path="/print-qr" element={<PrintQR />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/export" element={<Export />} />
            <Route path="/audit" element={<AuditLog />} />
            <Route path="/purge" element={<DataPurge />} />

            {/* Leader only routes */}
            <Route path="/assignments" element={<LeaderAssignments />} />
            <Route path="/register" element={<LeaderRegister />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}