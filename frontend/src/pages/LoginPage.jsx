import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, Link as RouterLink } from 'react-router';
import {
  Box, Button, Container, Typography, Paper,
  TextField, Divider, Link, CircularProgress,
} from '@mui/material';
import { getLoginUrl, localLogin } from '../api/services';
import { setCredentials } from '../store/slices/authSlice';
import { showSnackbar } from '../store/slices/uiSlice';

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCognitoLogin = async () => {
    try {
      const { data } = await getLoginUrl();
      window.location.href = data.data.loginUrl;
    } catch {
      dispatch(showSnackbar({ message: 'Failed to reach authentication server', severity: 'error' }));
    }
  };

  const handleLocalLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      dispatch(showSnackbar({ message: 'Please enter your email and password', severity: 'warning' }));
      return;
    }
    setLoading(true);
    try {
      const { data } = await localLogin({ email, password });
      dispatch(setCredentials({ token: data.data.token, user: data.data.user }));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      dispatch(showSnackbar({ message: msg, severity: 'error' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="background.default"
    >
      <Container maxWidth="xs" sx={{ px: { xs: 1, sm: 3 } }}>
        <Paper elevation={3} sx={{ p: { xs: 3, sm: 5 }, borderRadius: 2 }}>
          <Typography variant="h4" fontWeight={700} color="primary" gutterBottom textAlign="center">
            Navigo
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3} textAlign="center">
            Cloud-native project collaboration for distributed teams
          </Typography>

          {/* Email / Password form */}
          <Box component="form" onSubmit={handleLocalLogin}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              size="small"
              margin="dense"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              size="small"
              margin="dense"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>

          <Typography variant="body2" textAlign="center" mt={2}>
            Don&apos;t have an account?{' '}
            <Link component={RouterLink} to="/register">
              Register
            </Link>
          </Typography>

          <Divider sx={{ my: 3 }}>or</Divider>

          <Button variant="outlined" size="large" fullWidth onClick={handleCognitoLogin}>
            Sign in with Amazon Cognito
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
