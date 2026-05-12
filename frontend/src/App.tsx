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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { accessToken, isLoading } = useAuth();
  if (isLoading) return null;
  if (!accessToken) return <Navigate to="/" replace />;
  return <>{children}</>;
}


function AppRoutes() {
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
