import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Box, Chip, Avatar,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import EventIcon from '@mui/icons-material/Event';

const PRIORITY_COLORS = { Low: 'info', Medium: 'warning', High: 'error' };
const STATUS_COLORS = {
  Backlog: '#94a3b8',
  'To Do': '#3b82f4',
  'In Progress': '#f59e0b',
  Blocked: '#ef4444',
  Done: '#22c55e',
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'Done') return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}

export default function TaskViewDialog({ open, onClose, task, onEdit, canEdit }) {
  if (!task) return null;

  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={700} component="span">
          {task.title}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1, maxHeight: '70vh', overflowY: 'auto' }}>
        {/* Status + Priority row */}
        <Box display="flex" gap={1} flexWrap="wrap">
          <Chip
            label={task.status}
            size="small"
            sx={{ bgcolor: STATUS_COLORS[task.status] || '#94a3b8', color: '#fff', fontWeight: 600 }}
          />
          <Chip
            label={task.priority}
            size="small"
            color={PRIORITY_COLORS[task.priority] || 'default'}
          />
        </Box>

        {/* Description */}
        {task.description ? (
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
              Description
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
              {task.description}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.disabled" fontStyle="italic">No description</Typography>
        )}

        {/* Assignee */}
        {task.assignee && (
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar sx={{ width: 26, height: 26, fontSize: 13 }}>
              {(task.assignee.name || task.assignee.email || '?')[0].toUpperCase()}
            </Avatar>
            <Typography variant="body2">
              {task.assignee.name || task.assignee.email}
            </Typography>
          </Box>
        )}

        {/* Due date */}
        {task.dueDate && (
          <Box display="flex" alignItems="center" gap={0.75}>
            <EventIcon sx={{ fontSize: 14, color: overdue ? 'error.main' : 'text.secondary' }} />
            <Typography variant="body2" color={overdue ? 'error.main' : 'text.secondary'} fontWeight={overdue ? 600 : 400}>
              Due: {formatDate(task.dueDate)}{overdue ? ' — Overdue' : ''}
            </Typography>
          </Box>
        )}

        {/* Created at */}
        {task.createdAt && (
          <Box display="flex" alignItems="center" gap={0.75}>
            <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              Created: {new Date(task.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
        {canEdit && (
          <Button variant="contained" startIcon={<EditIcon />} onClick={() => { onClose(); onEdit(task); }}>
            Edit
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
