import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useDispatch } from 'react-redux';
import { Box, CircularProgress, Typography } from '@mui/material';
import { authCallback } from '../api/services';
import { setCredentials } from '../store/slices/authSlice';
import { showSnackbar } from '../store/slices/uiSlice';

export default function AuthCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const called = useRef(false); // prevents StrictMode double-invoke

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = params.get('code');
    if (!code) {
      dispatch(showSnackbar({ message: 'Authentication failed: no code received', severity: 'error' }));
      navigate('/login', { replace: true });
      return;
    }

    authCallback(code)
      .then(({ data }) => {
        dispatch(setCredentials({ token: data.data.token, user: data.data.user }));
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        dispatch(showSnackbar({ message: 'Authentication failed. Please try again.', severity: 'error' }));
        navigate('/login', { replace: true });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100vh">
      <CircularProgress />
      <Typography mt={2} color="text.secondary">
        Completing sign-in…
      </Typography>
    </Box>
  );
}
