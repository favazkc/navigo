import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Drawer, Box, Typography, Avatar, Divider, IconButton,
  Button, Switch, FormControlLabel,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router';
import { logout as logoutApi } from '../../api/services';
import { logout as logoutAction } from '../../store/slices/authSlice';
import { toggleTheme } from '../../store/slices/uiSlice';

export default function ProfileDrawer({ open, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);
  const themeMode = useSelector((s) => s.ui.themeMode);

  const handleLogout = async () => {
    try { await logoutApi(); } catch { /* ignore */ }
    dispatch(logoutAction());
    navigate('/login', { replace: true });
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 300, p: 0 } }}
    >
      {/* Header */}
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        px={2}
        py={1.5}
        borderBottom="1px solid"
        borderColor="divider"
      >
        <Typography variant="subtitle1" fontWeight={600}>Profile</Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Content */}
      <Box px={2.5} py={3} display="flex" flexDirection="column" gap={3}>

        {/* Avatar + identity */}
        <Box display="flex" flexDirection="column" alignItems="center" gap={0.75}>
          <Avatar sx={{ width: 64, height: 64, fontSize: 28, bgcolor: 'primary.main' }}>
            {(user?.name || user?.email || '?')[0].toUpperCase()}
          </Avatar>
          <Typography variant="body2" fontWeight={600}>
            {user?.name || '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {user?.email}
          </Typography>
          {user?.systemRole && (
            <Typography
              variant="caption"
              sx={{
                px: 1.25,
                py: 0.2,
                borderRadius: '10px',
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

        <Divider />

        {/* Dark mode */}
        <FormControlLabel
          sx={{ ml: 0 }}
          control={
            <Switch
              checked={themeMode === 'dark'}
              onChange={() => dispatch(toggleTheme())}
              size="small"
            />
          }
          label={<Typography variant="body2">Dark mode</Typography>}
        />

        <Divider />

        {/* Logout */}
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          fullWidth
        >
          Logout
        </Button>

      </Box>
    </Drawer>
  );
}
