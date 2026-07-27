import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams, Link as RouterLink } from 'react-router';
import {
  Box, Button, Container, Typography, Paper,
  TextField, Link, CircularProgress,
} from '@mui/material';
import { register } from '../api/services';
import { setCredentials } from '../store/slices/authSlice';
import { showSnackbar } from '../store/slices/uiSlice';

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const inviteEmail = searchParams.get('email') || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirm) {
      dispatch(showSnackbar({ message: 'All fields are required', severity: 'warning' }));
      return;
    }
    if (password.length < 8) {
      dispatch(showSnackbar({ message: 'Password must be at least 8 characters', severity: 'warning' }));
      return;
    }
    if (password !== confirm) {
      dispatch(showSnackbar({ message: 'Passwords do not match', severity: 'warning' }));
      return;
    }

    setLoading(true);
    try {
      const { data } = await register({ name, email, password });
      dispatch(setCredentials({ token: data.data.token, user: data.data.user }));
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
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
            TeamSphere
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3} textAlign="center">
            Create your account
          </Typography>

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Full Name"
              fullWidth
              size="small"
              margin="dense"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
            <TextField
              label="Email"
              type="email"
              fullWidth
              size="small"
              margin="dense"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              InputProps={{ readOnly: Boolean(inviteEmail) }}
              helperText={inviteEmail ? 'Email pre-filled from your invite' : undefined}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              size="small"
              margin="dense"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              helperText="Minimum 8 characters"
            />
            <TextField
              label="Confirm Password"
              type="password"
              fullWidth
              size="small"
              margin="dense"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={loading}
              sx={{ mt: 2 }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Create Account'}
            </Button>
          </Box>

          <Typography variant="body2" textAlign="center" mt={2}>
            Already have an account?{' '}
            <Link component={RouterLink} to="/login">
              Sign in
            </Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
