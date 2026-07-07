import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Container, Typography, Paper, TextField, Button, Divider,
  Avatar, Switch, FormControlLabel, CircularProgress,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router';
import Navbar from '../components/common/Navbar';
import { updateMe, logout as logoutApi } from '../api/services';
import { updateUser, logout as logoutAction } from '../store/slices/authSlice';
import { toggleTheme, showSnackbar } from '../store/slices/uiSlice';

export default function ProfilePage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const themeMode = useSelector((s) => s.ui.themeMode);

  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);

  const handleLogout = async () => {
    try { await logoutApi(); } catch { /* ignore */ }
    dispatch(logoutAction());
    navigate('/login', { replace: true });
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { data } = await updateMe({ name });
      dispatch(updateUser({ name: data.data.name }));
      dispatch(showSnackbar({ message: 'Profile updated', severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Failed to update profile', severity: 'error' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <Navbar />
      <Container maxWidth="sm" sx={{ py: 5 }}>
        <Paper elevation={2} sx={{ p: 4, borderRadius: 2 }}>
          {/* Avatar */}
          <Box display="flex" flexDirection="column" alignItems="center" mb={3}>
            <Avatar sx={{ width: 72, height: 72, fontSize: 32, bgcolor: 'primary.main', mb: 1 }}>
              {(user?.name || user?.email || '?')[0].toUpperCase()}
            </Avatar>
            <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
            {user?.systemRole && (
              <Typography
                variant="caption"
                sx={{
                  mt: 0.5,
                  px: 1.5,
                  py: 0.25,
                  borderRadius: '12px',
                  bgcolor: user.systemRole === 'admin' ? 'primary.main' : 'action.selected',
                  color: user.systemRole === 'admin' ? '#fff' : 'text.secondary',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >
                {user.systemRole}
              </Typography>
            )}
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Typography variant="h6" fontWeight={600} gutterBottom>
            Display Name
          </Typography>
          <Box display="flex" gap={2} alignItems="center">
            <TextField
              fullWidth
              size="small"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
            />
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!name.trim() || saving || name === user?.name}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {saving ? <CircularProgress size={18} /> : 'Save'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" fontWeight={600} gutterBottom>
            Appearance
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={themeMode === 'dark'}
                onChange={() => dispatch(toggleTheme())}
              />
            }
            label="Dark mode"
          />

          <Divider sx={{ my: 3 }} />

          <Button
            variant="outlined"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            fullWidth
          >
            Logout
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
