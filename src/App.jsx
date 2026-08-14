import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Items from './pages/Items';
import Equipment from './pages/Equipment';
import AssetDetail from './pages/AssetDetail';
import Teams from './pages/Teams';
import Categories from './pages/Categories';
import Reports from './pages/Reports';
import History from './pages/History';
import Invoices from './pages/Invoices';
import Settings from './pages/Settings';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route
        element={
          <ProtectedRoute>
            <DataProvider>
              <Layout />
            </DataProvider>
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Overview />} />
        <Route path="/itens" element={<Items />} />
        <Route path="/equipamentos" element={<Equipment />} />
        <Route path="/equipamentos/asset/:assetId" element={<AssetDetail />} />
        <Route path="/equipes" element={<Teams />} />
        <Route path="/categorias" element={<Categories />} />
        <Route path="/relatorios" element={<Reports />} />
        <Route path="/historico" element={<History />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/configuracoes" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
