import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-canvas text-ink">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-black/10 border-t-black rounded-full animate-spin"></div>
          <p className="font-bold text-xs uppercase tracking-widest animate-pulse">Menghubungkan Sesi...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
