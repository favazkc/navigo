import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box, Container, Typography, CircularProgress, Button, Table, TableHead,
  TableRow, TableCell, TableBody, MenuItem, Select, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl,
  InputLabel, Breadcrumbs, Link,
} from '@mui/material';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import Navbar from '../components/common/Navbar';
import { getMembers, getProject, inviteMember, changeMemberRole, removeMember } from '../api/services';
import { setMembers, removeMember as removeMemberAction, updateMemberRole } from '../store/slices/membersSlice';
import { setCurrentProject } from '../store/slices/projectsSlice';
import { showSnackbar } from '../store/slices/uiSlice';

export default function MembersPage() {
  const { id: projectId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { list: members, loading } = useSelector((s) => s.members);
  const { current: project } = useSelector((s) => s.projects);
  const { user } = useSelector((s) => s.auth);

  const [inviteDialog, setInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'Member' });
  const [inviting, setInviting] = useState(false);

  const isAdmin = project?.members?.some(
    (m) => (m.user?._id || m.user) === user?.id && m.role === 'Admin'
  );

  useEffect(() => {
    Promise.all([getProject(projectId), getMembers(projectId)])
      .then(([projRes, membersRes]) => {
        dispatch(setCurrentProject(projRes.data.data));
        dispatch(setMembers(membersRes.data.data));
      })
      .catch(() => {
        dispatch(showSnackbar({ message: 'Failed to load members', severity: 'error' }));
      });
  }, [projectId, dispatch]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await changeMemberRole(projectId, userId, newRole);
      dispatch(updateMemberRole({ userId, role: newRole }));
      dispatch(showSnackbar({ message: 'Role updated', severity: 'success' }));
    } catch {
      dispatch(showSnackbar({ message: 'Failed to update role', severity: 'error' }));
    }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove this member from the project?')) return;
    try {
      await removeMember(projectId, userId);
      dispatch(removeMemberAction(userId));
      dispatch(showSnackbar({ message: 'Member removed', severity: 'info' }));
    } catch {
      dispatch(showSnackbar({ message: 'Failed to remove member', severity: 'error' }));
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.email) return;
    setInviting(true);
    try {
      await inviteMember(projectId, inviteForm);
      dispatch(showSnackbar({ message: `Invite sent to ${inviteForm.email}`, severity: 'success' }));
      setInviteDialog(false);
      setInviteForm({ email: '', role: 'Member' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send invite';
      dispatch(showSnackbar({ message: msg, severity: 'error' }));
    } finally {
      setInviting(false);
    }
  };

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <Navbar />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Breadcrumbs sx={{ mb: 1 }}>
          <Link component="button" variant="body2" onClick={() => navigate('/dashboard')} underline="hover">
            Projects
          </Link>
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate(`/projects/${projectId}`)}
            underline="hover"
          >
            {project?.name}
          </Link>
          <Typography variant="body2" color="text.primary">Members</Typography>
        </Breadcrumbs>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight={700}>
            Team Members
          </Typography>
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<PersonAddIcon />}
              onClick={() => setInviteDialog(true)}
            >
              Invite Member
            </Button>
          )}
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" mt={8}><CircularProgress /></Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Email</TableCell>
                <TableCell>Role</TableCell>
                {isAdmin && <TableCell align="right">Actions</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((m) => {
                const isOwner = project?.owner?._id === m.user?._id || project?.owner === m.user?._id;
                return (
                  <TableRow key={m.user?._id}>
                    <TableCell>{m.user?.name || '—'}</TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{m.user?.email}</TableCell>
                    <TableCell>
                      {isAdmin && !isOwner ? (
                        <Select
                          value={m.role}
                          size="small"
                          onChange={(e) => handleRoleChange(m.user._id, e.target.value)}
                        >
                          <MenuItem value="Admin">Admin</MenuItem>
                          <MenuItem value="Member">Member</MenuItem>
                        </Select>
                      ) : (
                        <Chip
                          label={m.role}
                          size="small"
                          color={m.role === 'Admin' ? 'primary' : 'default'}
                        />
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell align="right">
                        {!isOwner && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleRemove(m.user._id)}
                          >
                            <PersonRemoveIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </Box>
        )}
      </Container>

      {/* Invite Dialog */}
      <Dialog open={inviteDialog} onClose={() => setInviteDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>Invite Team Member</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="Email Address"
            type="email"
            value={inviteForm.email}
            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
          />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select
              value={inviteForm.role}
              label="Role"
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
            >
              <MenuItem value="Member">Member</MenuItem>
              <MenuItem value="Admin">Admin</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setInviteDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleInvite}
            disabled={!inviteForm.email || inviting}
          >
            {inviting ? 'Sending…' : 'Send Invite'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
