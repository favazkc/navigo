import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Snackbar, Alert } from '@mui/material';
import { closeSnackbar } from '../../store/slices/uiSlice';

export default function GlobalSnackbar() {
  const dispatch = useDispatch();
  const { open, message, severity } = useSelector((s) => s.ui.snackbar);

  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={() => dispatch(closeSnackbar())}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={() => dispatch(closeSnackbar())}
        severity={severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
}
