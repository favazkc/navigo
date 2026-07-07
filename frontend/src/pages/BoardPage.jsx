import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Typography, CircularProgress, Button, Breadcrumbs, Link, Tooltip, Chip, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import AddIcon from '@mui/icons-material/Add';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EventIcon from '@mui/icons-material/Event';
import { DragDropContext } from '@hello-pangea/dnd';
import Navbar from '../components/common/Navbar';
import KanbanColumn from '../components/board/KanbanColumn';
import TaskDialog from '../components/board/TaskDialog';
import {
  setTasks, addTask, updateTask, removeTask, reorderTasks,
} from '../store/slices/tasksSlice';
import { setCurrentProject } from '../store/slices/projectsSlice';
import { setMembers } from '../store/slices/membersSlice';
import { showSnackbar } from '../store/slices/uiSlice';
import {
  getTasks, getProject, getMembers, createTask, updateTask as apiUpdateTask,
  deleteTask, reorderTasks as apiReorderTasks,
} from '../api/services';

const STATUSES = ['Backlog', 'To Do', 'In Progress', 'Blocked', 'Done'];
const POLL_INTERVAL = 10_000;

export default function BoardPage() {
  const { id: projectId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { list: tasks } = useSelector((s) => s.tasks);
  const { current: project } = useSelector((s) => s.projects);
  const { list: members } = useSelector((s) => s.members);
  const { user } = useSelector((s) => s.auth);

  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [defaultStatus, setDefaultStatus] = useState('Backlog');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterPriority, setFilterPriority] = useState('');

  const pollRef = useRef(null);

  const isAdmin = project?.members?.some(
    (m) => (m.user?._id || m.user) === user?.id && m.role === 'Admin'
  );

  const fetchTasks = useCallback(() => {
    getTasks(projectId)
      .then(({ data }) => dispatch(setTasks(data.data)))
      .catch(() => {});
  }, [projectId, dispatch]);

  const fetchProject = useCallback(() => {
    getProject(projectId)
      .then(({ data }) => dispatch(setCurrentProject(data.data)))
      .catch(() => {});
  }, [projectId, dispatch]);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getProject(projectId),
      getTasks(projectId),
      getMembers(projectId),
    ])
      .then(([projRes, tasksRes, membersRes]) => {
        if (cancelled) return;
        dispatch(setCurrentProject(projRes.data.data));
        dispatch(setTasks(tasksRes.data.data));
        dispatch(setMembers(membersRes.data.data));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          dispatch(showSnackbar({ message: 'Failed to load board', severity: 'error' }));
          setLoading(false);
        }
      });

    // Polling — refresh both tasks and project status
    pollRef.current = setInterval(() => {
      fetchTasks();
      fetchProject();
    }, POLL_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(pollRef.current);
    };
  }, [projectId, dispatch, fetchTasks, fetchProject]);

  // ── Drag and drop ───────────────────────────────────────────────────────────
  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const task = tasks.find((t) => t._id === draggableId);
    if (!task) return;

    const newStatus = destination.droppableId;
    const tasksInDest = tasks
      .filter((t) => t._id !== draggableId && t.status === newStatus)
      .sort((a, b) => a.order - b.order);

    tasksInDest.splice(destination.index, 0, { ...task, status: newStatus });

    const updates = tasksInDest.map((t, i) => ({
      id: t._id,
      order: i,
      status: newStatus,
    }));

    // Optimistic update
    const updated = tasks.map((t) => {
      const upd = updates.find((u) => u.id === t._id);
      return upd ? { ...t, order: upd.order, status: upd.status } : t;
    });
    dispatch(reorderTasks(updated));

    try {
      await apiReorderTasks(projectId, updates);
      fetchProject(); // status may have changed (e.g. all moved to Done)
    } catch {
      dispatch(showSnackbar({ message: 'Failed to reorder tasks', severity: 'error' }));
      fetchTasks(); // Revert
    }
  };

  // ── Task actions ────────────────────────────────────────────────────────────
  const handleAddTask = () => {
    setEditingTask(null);
    setDefaultStatus('Backlog');
    setDialogOpen(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setDialogOpen(true);
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const { data } = await apiUpdateTask(projectId, taskId, { status: 'Done' });
      dispatch(updateTask(data.data));
      dispatch(showSnackbar({ message: 'Task marked as Done', severity: 'success' }));
      fetchProject(); // may have become Done if this was the last task
    } catch {
      dispatch(showSnackbar({ message: 'Failed to complete task', severity: 'error' }));
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await deleteTask(projectId, taskId);
      dispatch(removeTask(taskId));
      dispatch(showSnackbar({ message: 'Task deleted', severity: 'info' }));
      fetchProject(); // task count changed — status may revert
    } catch {
      dispatch(showSnackbar({ message: 'Failed to delete task', severity: 'error' }));
    }
  };

  const handleDialogSubmit = async (formData) => {
    try {
      if (editingTask) {
        const { data } = await apiUpdateTask(projectId, editingTask._id, formData);
        dispatch(updateTask(data.data));
        dispatch(showSnackbar({ message: 'Task updated', severity: 'success' }));
      } else {
        const { data } = await createTask(projectId, formData);
        dispatch(addTask(data.data));
        dispatch(showSnackbar({ message: 'Task created', severity: 'success' }));
      }
      fetchProject(); // status may have changed
      setDialogOpen(false);
      setEditingTask(null);
    } catch {
      dispatch(showSnackbar({ message: 'Failed to save task', severity: 'error' }));
    }
  };

  if (loading) {
    return (
      <Box minHeight="100vh" bgcolor="background.default">
        <Navbar />
        <Box display="flex" justifyContent="center" mt={8}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  return (
    <Box minHeight="100vh" bgcolor="background.default" display="flex" flexDirection="column">
      <Navbar />
      <Box sx={{ px: 3, pt: 2, pb: 1 }}>
        <Breadcrumbs>
          <Link
            component="button"
            variant="body2"
            onClick={() => navigate('/dashboard')}
            underline="hover"
          >
            Projects
          </Link>
          <Typography variant="body2" color="text.primary" fontWeight={600}>
            {project?.name}
          </Typography>
        </Breadcrumbs>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mt={1} gap={2}>
          <Box>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Typography variant="h5" fontWeight={700}>
                {project?.name}
              </Typography>
              {project?.status && (
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
            </Box>
            <Box display="flex" gap={2} mt={0.5} flexWrap="wrap">
              {project?.createdAt && (
                <Box display="flex" alignItems="center" gap={0.5}>
                  <CalendarTodayIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    Created: {new Date(project.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </Typography>
                </Box>
              )}
              {project?.dueDate ? (
                <Tooltip title={new Date(project.dueDate) < new Date(new Date().toDateString()) ? 'Project is overdue' : ''}>
                  <Box display="flex" alignItems="center" gap={0.5} sx={{ cursor: 'default' }}>
                    <EventIcon sx={{ fontSize: 13, color: new Date(project.dueDate) < new Date(new Date().toDateString()) ? 'error.main' : 'text.secondary' }} />
                    <Typography
                      variant="caption"
                      color={new Date(project.dueDate) < new Date(new Date().toDateString()) ? 'error.main' : 'text.secondary'}
                      fontWeight={new Date(project.dueDate) < new Date(new Date().toDateString()) ? 600 : 400}
                    >
                      Due: {new Date(project.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      {new Date(project.dueDate) < new Date(new Date().toDateString()) ? ' — Overdue' : ''}
                    </Typography>
                  </Box>
                </Tooltip>
              ) : (
                <Box display="flex" alignItems="center" gap={0.5}>
                  <EventIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
                  <Typography variant="caption" color="text.disabled">No due date</Typography>
                </Box>
              )}
            </Box>
          </Box>
          <Box display="flex" gap={1.5} alignItems="center" flexShrink={0}>
            {/* Filter by Assignee */}
            <FormControl size="small" sx={{ width: 130, '& .MuiSelect-select': { py: '5px' } }}>
              <InputLabel shrink>Assignee</InputLabel>
              <Select
                value={filterAssignee}
                label="Assignee"
                displayEmpty
                notched
                onChange={(e) => setFilterAssignee(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="__unassigned__">Unassigned</MenuItem>
                {members
                  .filter((m) => m.user != null)
                  .map((m) => (
                    <MenuItem key={m.user._id} value={m.user._id}>
                      {m.user.name || m.user.email}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            {/* Filter by Priority */}
            <FormControl size="small" sx={{ width: 110, '& .MuiSelect-select': { py: '5px' } }}>
              <InputLabel shrink>Priority</InputLabel>
              <Select
                value={filterPriority}
                label="Priority"
                displayEmpty
                notched
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
              </Select>
            </FormControl>

            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddTask}
            >
              Create Task
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PeopleIcon />}
              onClick={() => navigate(`/projects/${projectId}/members`)}
            >
              Members ({project?.members?.length || 0})
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Kanban Board */}
      <Box sx={{ flexGrow: 1, overflowX: 'auto', px: 3, pb: 3 }}>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Box display="flex" gap={2} sx={{ minWidth: 'max-content', pt: 1 }}>
            {STATUSES.map((status) => {
              const columnTasks = tasks
                .filter((t) => t.status === status)
                .filter((t) => {
                  if (filterAssignee === '__unassigned__') return !t.assignee;
                  if (filterAssignee) return t.assignee?._id === filterAssignee;
                  return true;
                })
                .filter((t) => filterPriority ? t.priority === filterPriority : true)
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
              return (
                <KanbanColumn
                  key={status}
                  status={status}
                  tasks={columnTasks}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onCompleteTask={handleCompleteTask}
                  isAdmin={isAdmin}
                />
              );
            })}
          </Box>
        </DragDropContext>
      </Box>

      {/* Task Create/Edit Dialog */}
      <TaskDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingTask(null); }}
        onSubmit={handleDialogSubmit}
        initialData={editingTask}
        members={members}
        currentUserId={user?.id}
        isAdmin={isAdmin}
      />
    </Box>
  );
}
