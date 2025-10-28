import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { AuthCallback } from './components/AuthCallback';
import { SetNickname } from './components/SetNickname';
import WorldMap from './WorldMap';
import MainMenu from './components/MainMenu';
import { useAuth } from './contexts/AuthContext';
import './App.css';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b1020', color: '#fff'}}><div>Loading...</div></div>;
  return isAuthenticated ? <>{children}</> : <Navigate to='/login' replace />;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b1020', color: '#fff'}}><div>Loading...</div></div>;
  return !isAuthenticated ? <>{children}</> : <Navigate to='/' replace />;
}

export default function App() {
  const location = useLocation();
  const isMapRoute = location.pathname.startsWith('/map');
  const isAuthRoute = ['/login', '/register', '/set-nickname', '/auth/callback'].some(p => location.pathname.startsWith(p));
  const hideNav = isMapRoute || isAuthRoute;
  return (
    <>
      {!hideNav && <Navbar />}
      <div className="container-fluid p-0"
        style={{
          marginTop: hideNav ? 0 : 64,
          height: hideNav ? '100dvh' : 'calc(100dvh - 64px)',
          width: '100%',
          overflowX: 'hidden',
          overflowY: isMapRoute ? 'hidden' : 'auto',
        }}
      >
        <Routes>
          <Route path='/login' element={<GuestRoute><Login /></GuestRoute>} />
          <Route path='/register' element={<GuestRoute><Register /></GuestRoute>} />
          <Route path='/auth/callback' element={<AuthCallback />} />
          <Route
            path='/set-nickname'
            element={
              <ProtectedRoute>
                <SetNickname />
              </ProtectedRoute>
            }
          />
          <Route
            path='/'
            element={
              <ProtectedRoute>
                <MainMenu />
              </ProtectedRoute>
            }
          />
          <Route
            path='/map'
            element={
              <ProtectedRoute>
                <WorldMap />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </>
  );
}
