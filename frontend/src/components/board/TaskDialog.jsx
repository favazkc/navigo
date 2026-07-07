import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Button, MenuItem, Select, InputLabel, FormControl, Typography, Box,
} from '@mui/material';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';

// "Done" is excluded from create — tasks can only reach Done via Complete button or drag
const CREATE_STATUSES = ['Backlog', 'To Do', 'In Progress', 'Blocked'];
const ALL_STATUSES = ['Backlog', 'To Do', 'In Progress', 'Blocked', 'Done'];
const PRIORITIES = ['Low', 'Medium', 'High'];

function buildForm(data) {
  return {
    title: data.title || '',
    description: data.description || '',
    status: data.status || 'Backlog',
    priority: data.priority || 'Medium',
    dueDate: data.dueDate ? data.dueDate.slice(0, 10) : '',
    assignee: data.assignee?._id || data.assignee || '',
  };
}

export default function TaskDialog({ open, onClose, onSubmit, initialData, members = [], currentUserId, isAdmin }) {
  const [form, setForm] = useState(() => buildForm(initialData || {}));
  const [submitting, setSubmitting] = useState(false);

  // Keep a ref to always have the latest initialData without making it a reactive dependency.
  // The form is only reset when the dialog *opens* — not on every re-render caused by polling.
  const initialDataRef = useRef(initialData);
  initialDataRef.current = initialData;

  useEffect(() => {
    if (open) {
      setForm(buildForm(initialDataRef.current || {}));
    }
  }, [open]); // intentionally only [open] — avoids poll-induced re-renders clearing the form

  const isEditing = Boolean(initialData?._id);
  const statusOptions = isEditing ? ALL_STATUSES : CREATE_STATUSES;

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setSubmitting(true);
    const payload = {
      ...form,
      dueDate: form.dueDate || null,
      assignee: form.assignee || null,
    };
    await onSubmit(payload);
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{initialData?._id ? 'Edit Task' : 'Create Task'}</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
        <TextField
          autoFocus
          fullWidth
          label="Title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
        <TextField
          fullWidth
          label="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          multiline
          rows={3}
        />
        <FormControl fullWidth>
          <InputLabel>Status</InputLabel>
          <Select
            value={form.status}
            label="Status"
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {statusOptions.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>Priority</InputLabel>
          <Select
            value={form.priority}
            label="Priority"
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            {PRIORITIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField
          fullWidth
          label="Due Date"
          type="date"
          InputLabelProps={{ shrink: true }}
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
        />
        {/* Created At — read-only, only shown when editing an existing task */}
        {initialData?.createdAt && (
          <Box display="flex" alignItems="center" gap={0.75}>
            <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              Created: {new Date(initialData.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Typography>
          </Box>
        )}
        {members.length > 0 && (
          <FormControl fullWidth>
            <InputLabel>Assignee</InputLabel>
            <Select
              value={form.assignee}
              label="Assignee"
              onChange={(e) => setForm({ ...form, assignee: e.target.value })}
              disabled={!isAdmin && isEditing && initialData?.assignee?._id !== currentUserId && initialData?.assignee !== currentUserId}
            >
              <MenuItem value="">Unassigned</MenuItem>
              {members
                .filter((m) => m.user != null && (isAdmin || !isEditing || m.user._id === currentUserId || initialData?.assignee?._id === currentUserId || initialData?.assignee === currentUserId))
                .map((m) => (
                  <MenuItem key={m.user._id} value={m.user._id}>
                    {m.user.name || m.user.email}{m.user._id === currentUserId ? ' (You)' : ''}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!form.title.trim() || submitting}
        >
          {submitting ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
