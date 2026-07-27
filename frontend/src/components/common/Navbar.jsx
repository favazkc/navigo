import React, { useState } from 'react';
import {
  AppBar, Toolbar, Typography, IconButton, Box, Tooltip,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { useNavigate } from 'react-router';
import ProfileDrawer from './ProfileDrawer';

export default function Navbar() {
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
          <Typography
            variant="h6"
            fontWeight={700}
            noWrap
            sx={{ flexGrow: 1, minWidth: 0, cursor: 'pointer' }}
            onClick={() => navigate('/dashboard')}
          >
            TeamSphere
          </Typography>

          <Box display="flex" alignItems="center" gap={1}>
            <Tooltip title="Profile">
              <IconButton color="inherit" sx={{ p: 1 }} onClick={() => setDrawerOpen(true)}>
                <AccountCircleIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <ProfileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
