import { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import AppRouter from '@/router';
import { getCurrentUser, setInitialized } from '@/store/slices/authSlice';

function App() {
  useEffect(() => {
    // Get current user on app start if token exists
    const token = localStorage.getItem('token');
    if (token) {
      store.dispatch(getCurrentUser());
    } else {
      // No token, mark as initialized
      store.dispatch(setInitialized());
    }
  }, []);

  return (
    <Provider store={store}>
      <AppRouter />
    </Provider>
  );
}

export default App;
