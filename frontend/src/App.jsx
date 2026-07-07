import React, { useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { useSelector } from 'react-redux';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { lazy, Suspense } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import GlobalSnackbar from './components/common/GlobalSnackbar';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const BoardPage = lazy(() => import('./pages/BoardPage'));
const MembersPage = lazy(() => import('./pages/MembersPage'));
const InviteAcceptPage = lazy(() => import('./pages/InviteAcceptPage'));

// ── Private Route ─────────────────────────────────────────────────────────────
const PrivateRoute = ({ children }) => {
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const LoadingFallback = () => (
  <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
    <CircularProgress />
  </Box>
);

export default function App() {
  const themeMode = useSelector((s) => s.ui.themeMode);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: themeMode,
          primary: { main: '#3b82d4' },
          secondary: { main: '#7c5cd8' },
        },
        typography: {
          fontFamily: ['-apple-system', '"Segoe UI"', 'system-ui', 'sans-serif'].join(','),
        },
      }),
    [themeMode]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalSnackbar />
      <BrowserRouter>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/invites/accept" element={<InviteAcceptPage />} />

            {/* Private routes */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <DashboardPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/projects/:id"
              element={
                <PrivateRoute>
                  <BoardPage />
                </PrivateRoute>
              }
            />
            <Route
              path="/projects/:id/members"
              element={
                <PrivateRoute>
                  <MembersPage />
                </PrivateRoute>
              }
            />
            {/* Default */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
