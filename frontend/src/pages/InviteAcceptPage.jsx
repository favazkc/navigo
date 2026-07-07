import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { Box, CircularProgress, Typography, Paper, Button, Container } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { acceptInvite } from '../api/services';

export default function InviteAcceptPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, success: false, message: '', projectId: null });

  const calledRef = React.useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const token = params.get('token');
    if (!token) {
      setState({ loading: false, success: false, message: 'Invalid invite link.' });
      return;
    }
    acceptInvite(token)
      .then(({ data }) => {
        setState({
          loading: false,
          success: true,
          message: `You have joined "${data.data.projectName}"!`,
          projectId: data.data.projectId,
          isNewUser: data.data.isNewUser,
          email: data.data.email,
        });
      })
      .catch((err) => {
        const msg = err.response?.data?.message || 'Failed to accept invite.';
        setState({ loading: false, success: false, message: msg });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh" bgcolor="background.default">
      <Container maxWidth="xs">
        <Paper elevation={3} sx={{ p: 5, textAlign: 'center', borderRadius: 2 }}>
          {state.success ? (
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
          ) : (
            <ErrorOutlineIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
          )}
          <Typography variant="h6" gutterBottom>
            {state.message}
          </Typography>
          {state.success ? (
            state.isNewUser ? (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Create a password to finish setting up your account.
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => navigate(`/register?email=${encodeURIComponent(state.email)}`)}
                >
                  Set Up Your Account
                </Button>
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Sign in to access the project.
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => navigate('/login')}
                >
                  Sign In
                </Button>
              </>
            )
          ) : (
            <Button variant="outlined" sx={{ mt: 2 }} onClick={() => navigate('/login')}>
              Go to Login
            </Button>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
