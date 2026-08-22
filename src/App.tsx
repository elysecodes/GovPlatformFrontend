import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Dashboard } from './pages/Dashboard';
import { Complaints } from './pages/Complaints';
import { ComplaintDetail } from './pages/ComplaintDetail';
import { Requests } from './pages/Requests';
import { RequestDetail } from './pages/RequestDetail';
import { Reports } from './pages/Reports';
import { ReportDetail } from './pages/ReportDetail';
import { Announcements } from './pages/Announcements';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { Events } from './pages/Events';
import { Notifications } from './pages/Notifications';
import { Users } from './pages/Users';
import { Households } from './pages/Households';
import { Citizens } from './pages/Citizens';
import { Tasks } from './pages/Tasks';
import { Meetings } from './pages/Meetings';
import { Cooperatives } from './pages/Cooperatives';
import { AuditLogs } from './pages/AuditLogs';
import { Profile } from './pages/Profile';
import { ChangePassword } from './pages/ChangePassword';

function Protected({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  return children;
}

/** Auth-only guard: does NOT redirect mustChangePassword users (used by /change-password itself). */
function RequireAuth({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({ roles, children }: { roles: string[]; children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

const ADMIN_ROLES = ['SUPER_ADMIN', 'PROVINCE_ADMIN', 'DISTRICT_ADMIN', 'SECTOR_ADMIN', 'CELL_ADMIN', 'VILLAGE_ADMIN'];

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/change-password" element={<RequireAuth><ChangePassword /></RequireAuth>} />

      <Route
        path="/*"
        element={
          <Protected>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/complaints" element={<Complaints />} />
                <Route path="/complaints/new" element={<Complaints />} />
                <Route path="/complaints/:id" element={<ComplaintDetail />} />
                <Route path="/requests" element={<Requests />} />
                <Route path="/requests/new" element={<Requests />} />
                <Route path="/requests/:id" element={<RequestDetail />} />
                <Route path="/reports" element={<RequireRole roles={ADMIN_ROLES}><Reports /></RequireRole>} />
                <Route path="/reports/:id" element={<RequireRole roles={ADMIN_ROLES}><ReportDetail /></RequireRole>} />
                <Route path="/announcements" element={<Announcements />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/events" element={<Events />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/users" element={<RequireRole roles={['SUPER_ADMIN', 'PROVINCE_ADMIN', 'DISTRICT_ADMIN', 'SECTOR_ADMIN', 'CELL_ADMIN']}><Users /></RequireRole>} />
                <Route path="/households" element={<RequireRole roles={['SUPER_ADMIN', 'PROVINCE_ADMIN', 'DISTRICT_ADMIN', 'SECTOR_ADMIN', 'CELL_ADMIN', 'VILLAGE_ADMIN']}><Households /></RequireRole>} />
                <Route path="/citizens" element={<RequireRole roles={ADMIN_ROLES}><Citizens /></RequireRole>} />
                <Route path="/tasks" element={<RequireRole roles={ADMIN_ROLES}><Tasks /></RequireRole>} />
                <Route path="/meetings" element={<Meetings />} />
                <Route path="/cooperatives" element={<RequireRole roles={ADMIN_ROLES}><Cooperatives /></RequireRole>} />
                <Route path="/audit-logs" element={<RequireRole roles={['SUPER_ADMIN', 'PROVINCE_ADMIN', 'DISTRICT_ADMIN', 'SECTOR_ADMIN']}><AuditLogs /></RequireRole>} />
                <Route path="/profile" element={<Profile />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </Protected>
        }
      />
    </Routes>
  );
}

export default App;
