import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';

const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import('./pages/ResetPassword').then((m) => ({ default: m.ResetPassword })));
const ChangePassword = lazy(() => import('./pages/ChangePassword').then((m) => ({ default: m.ChangePassword })));
const Dashboard = lazy(() => import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const Complaints = lazy(() => import('./pages/Complaints').then((m) => ({ default: m.Complaints })));
const ComplaintDetail = lazy(() => import('./pages/ComplaintDetail').then((m) => ({ default: m.ComplaintDetail })));
const Requests = lazy(() => import('./pages/Requests').then((m) => ({ default: m.Requests })));
const RequestDetail = lazy(() => import('./pages/RequestDetail').then((m) => ({ default: m.RequestDetail })));
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));
const ReportDetail = lazy(() => import('./pages/ReportDetail').then((m) => ({ default: m.ReportDetail })));
const Announcements = lazy(() => import('./pages/Announcements').then((m) => ({ default: m.Announcements })));
const Projects = lazy(() => import('./pages/Projects').then((m) => ({ default: m.Projects })));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail').then((m) => ({ default: m.ProjectDetail })));
const Events = lazy(() => import('./pages/Events').then((m) => ({ default: m.Events })));
const Agenda = lazy(() => import('./pages/Agenda').then((m) => ({ default: m.Agenda })));
const Notifications = lazy(() => import('./pages/Notifications').then((m) => ({ default: m.Notifications })));
const Users = lazy(() => import('./pages/Users').then((m) => ({ default: m.Users })));
const Households = lazy(() => import('./pages/Households').then((m) => ({ default: m.Households })));
const Citizens = lazy(() => import('./pages/Citizens').then((m) => ({ default: m.Citizens })));
const Tasks = lazy(() => import('./pages/Tasks').then((m) => ({ default: m.Tasks })));
const Meetings = lazy(() => import('./pages/Meetings').then((m) => ({ default: m.Meetings })));
const Cooperatives = lazy(() => import('./pages/Cooperatives').then((m) => ({ default: m.Cooperatives })));
const AuditLogs = lazy(() => import('./pages/AuditLogs').then((m) => ({ default: m.AuditLogs })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));

function Spinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="h-8 w-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
    </div>
  );
}

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
    <Suspense fallback={<Spinner />}>
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
                <Route path="/agenda" element={<Agenda />} />
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
    </Suspense>
  );
}

export default App;
