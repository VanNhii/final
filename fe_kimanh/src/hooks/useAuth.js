import { useSelector } from 'react-redux';

export const useAuth = () => {
  const { user, token, isLoading, isAuthenticated, isInitialized, error } = useSelector((state) => state.auth);

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    isInitialized,
    error,
    isAdmin: user?.role === 'admin',
    isRecruiter: user?.role === 'recruiter',
    isCandidate: user?.role === 'candidate',
  };
};

export default useAuth;
