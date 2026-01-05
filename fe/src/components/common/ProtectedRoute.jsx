import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const { isAuthenticated, user, isLoading, isInitialized } = useSelector((state) => state.auth);
  const location = useLocation();

  // Show loading while checking authentication status
  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save current location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    // Redirect to appropriate dashboard based on role
    const dashboardPath = user?.role === 'admin' 
      ? '/admin/dashboard' 
      : user?.role === 'recruiter' 
        ? '/recruiter/dashboard' 
        : '/candidate/dashboard';
    return <Navigate to={dashboardPath} replace />;
  }

  return children || <Outlet />;
};

export default ProtectedRoute;
