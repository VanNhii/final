import { useSelector } from 'react-redux';
import { Navigate } from 'react-router';
import LoadingSpinner from './LoadingSpinner';

const PublicRoute = ({ children }) => {
  const { isAuthenticated, user, isLoading, isInitialized } = useSelector((state) => state.auth);

  // Show loading while checking authentication status
  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    // Redirect to appropriate dashboard based on role
    const redirectPaths = {
      admin: '/admin/dashboard',
      recruiter: '/recruiter/dashboard',
      candidate: '/candidate/dashboard',
    };
    
    return <Navigate to={redirectPaths[user.role] || '/'} replace />;
  }

  return children;
};

export default PublicRoute;
