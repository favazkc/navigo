import React, { useEffect, useState } from 'react';
import {
  Box, Container, Typography, Button, Grid, Card, CardContent,
  CardActions, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EventIcon from '@mui/icons-material/Event';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router';
import Navbar from '../components/common/Navbar';
import { getProjects, createProject, deleteProject } from '../api/services';
import {
  setProjects, addProject, removeProject, setLoading, setError,
} from '../store/slices/projectsSlice';
import { showSnackbar } from '../store/slices/uiSlice';

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function isOverdue(dueDate) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export default function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { list: projects, loading } = useSelector((s) => s.projects);
  const { user } = useSelector((s) => s.auth);
  const isSystemAdmin = user?.systemRole === 'admin';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', dueDate: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(setLoading(true));
    getProjects()
      .then(({ data }) => dispatch(setProjects(data.data)))
      .catch(() => {
        dispatch(setError('Failed to load projects'));
        dispatch(showSnackbar({ message: 'Failed to load projects', severity: 'error' }));
      });
  }, [dispatch]);

  const handleOpenDialog = () => {
    setForm({ name: '', description: '', dueDate: '' });
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        dueDate: form.dueDate || null,
      };
      const { data } = await createProject(payload);
      dispatch(addProject(data.data));
      dispatch(showSnackbar({ message: 'Project created!', severity: 'success' }));
      setDialogOpen(false);
      setForm({ name: '', description: '', dueDate: '' });
    } catch {
      dispatch(showSnackbar({ message: 'Failed to create project', severity: 'error' }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this project and all its tasks?')) return;
    try {
      await deleteProject(id);
      dispatch(removeProject(id));
      dispatch(showSnackbar({ message: 'Project deleted', severity: 'info' }));
    } catch {
      dispatch(showSnackbar({ message: 'Failed to delete project', severity: 'error' }));
    }
  };

  return (
    <Box minHeight="100vh" bgcolor="background.default">
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="space-between" flexDirection={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2} mb={3}>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              My Projects
            </Typography>
            {!isSystemAdmin && (
              <Typography variant="caption" color="text.secondary">
                Contact an administrator to create new projects
              </Typography>
            )}
          </Box>
          {isSystemAdmin && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
            >
              New Project
            </Button>
          )}
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" mt={8}>
            <CircularProgress />
          </Box>
        ) : projects.length === 0 ? (
          <Box textAlign="center" mt={8}>
            <Typography color="text.secondary">
              {isSystemAdmin
                ? 'No projects yet. Create your first one!'
                : 'No projects assigned yet. Contact an administrator to be added to a project.'}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {projects.map((project) => {
              const myRole = project.members?.find((m) => m.user?._id === user?.id || m.user === user?.id)?.role;
              const isAdmin = myRole === 'Admin';
              const overdue = isOverdue(project.dueDate);
              return (
                <Grid item xs={12} sm={6} md={4} key={project._id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      border: overdue ? '2px solid #ef4444' : '2px solid transparent',
                    }}
                    onClick={() => navigate(`/projects/${project._id}`)}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" fontWeight={600} gutterBottom noWrap>
                        {project.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        {project.description || 'No description'}
                      </Typography>

                      {/* Dates */}
                      <Box display="flex" flexDirection="column" gap={0.5} mb={1.5}>
                        {project.createdAt && (
                          <Box display="flex" alignItems="center" gap={0.75}>
                            <CalendarTodayIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                              Created: {formatDate(project.createdAt)}
                            </Typography>
                          </Box>
                        )}
                        {project.dueDate ? (
                          <Box display="flex" alignItems="center" gap={0.75}>
                            <EventIcon sx={{ fontSize: 13, color: overdue ? 'error.main' : 'text.secondary' }} />
                            <Typography
                              variant="caption"
                              color={overdue ? 'error.main' : 'text.secondary'}
                              fontWeight={overdue ? 600 : 400}
                            >
                              Due: {formatDate(project.dueDate)}{overdue ? ' — Overdue' : ''}
                            </Typography>
                          </Box>
                        ) : (
                          <Box display="flex" alignItems="center" gap={0.75}>
                            <EventIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                            <Typography variant="caption" color="text.disabled">
                              No due date
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      <Box display="flex" gap={1} flexWrap="wrap">
                        {project.status && (
                          <Chip
                            label={project.status}
                            size="small"
                            sx={{
                              bgcolor:
                                project.status === 'Done' ? '#22c55e' :
                                project.status === 'In Progress' ? '#f59e0b' :
                                '#94a3b8',
                              color: '#fff',
                              fontWeight: 600,
                            }}
                          />
                        )}
                        {myRole && (
                          <Chip
                            label={myRole}
                            size="small"
                            color={myRole === 'Admin' ? 'primary' : 'default'}
                          />
                        )}
                      </Box>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
                      <Button
                        size="small"
                        startIcon={<PeopleIcon />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/${project._id}/members`);
                        }}
                      >
                        Members
                      </Button>
                      {isAdmin && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => handleDelete(e, project._id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Container>

      {/* Create Project Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create New Project</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            label="Project Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            inputProps={{ maxLength: 100 }}
          />
          <TextField
            fullWidth
            label="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            multiline
            rows={3}
          />
          <TextField
            fullWidth
            label="Due Date (optional)"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!form.name.trim() || submitting}
          >
            {submitting ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
