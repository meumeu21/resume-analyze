import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import Subscriptions from './pages/Subscriptions';
import Subscriptors from './pages/Subscriptors';
import Favourites from './pages/Favourites';
import Project from './pages/Project';
import Developers from './pages/Developers';
import Home from './pages/Home';
import Neuro from './pages/Neuro';
import ErrorPage from './pages/ErrorPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken, isLoading } = useAuth();
  if (isLoading) return null;
  if (!accessToken) return <Navigate to="/" replace />;
  return <>{children}</>;
}


function AppRoutes() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !user) return;
    if (!sessionStorage.getItem('vpnAlertShown')) {
      sessionStorage.setItem('vpnAlertShown', '1');
      alert('Для работы AI необходимо включить VPN');
    }
  }, [user, isLoading]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/users/:id" element={<ProfilePage />} />
      <Route path="/subscriptions" element={<ProtectedRoute><Subscriptions /></ProtectedRoute>} />
      <Route path="/subscriptors" element={<ProtectedRoute><Subscriptors /></ProtectedRoute>} />
      <Route path="/favourites" element={<ProtectedRoute><Favourites /></ProtectedRoute>} />
      <Route path="/projects/:id" element={<Project />} />
      <Route path="/developers" element={<Developers />} />
      <Route path="/neuro" element={<Neuro />} />
      <Route path="/404" element={<ErrorPage code={404} />} />
      <Route path="/500" element={<ErrorPage code={500} />} />
      <Route path="*" element={<ErrorPage code={404} />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
