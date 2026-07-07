import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, Typography, Chip, Box, Avatar, IconButton, Tooltip, Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const PRIORITY_COLORS = { Low: 'info', Medium: 'warning', High: 'error' };

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isOverdue(dueDate, status) {
  if (!dueDate || status === 'Done') return false;
  return new Date(dueDate) < new Date(new Date().toDateString()); // compare date-only (no time)
}

export default function TaskCard({ task, index, onView, onDelete, onComplete, isAdmin }) {
  const overdue = isOverdue(task.dueDate, task.status);

  return (
    <Draggable draggableId={task._id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          elevation={snapshot.isDragging ? 6 : 1}
          onClick={() => !snapshot.isDragging && onView(task)}
          sx={{
            mb: 1.5,
            borderRadius: 2,
            opacity: snapshot.isDragging ? 0.95 : 1,
            transition: 'box-shadow 0.2s',
            bgcolor: overdue ? '#fff0f0' : undefined,
            cursor: 'pointer',
            '&:hover': { boxShadow: 4 },
          }}
        >
          <CardContent sx={{ pb: '8px !important', pt: 1.5, px: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
              <Typography variant="body1" fontWeight={600} sx={{ mr: 1, flexGrow: 1 }}>
                {task.title}
              </Typography>
              <Box display="flex">
                {isAdmin && (
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onDelete(task._id); }}>
                      <DeleteIcon fontSize="inherit" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>

            {task.description && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                {task.description.length > 80
                  ? `${task.description.slice(0, 80)}…`
                  : task.description}
              </Typography>
            )}

            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mt={0.5}>
              <Chip
                label={task.priority}
                size="small"
                color={PRIORITY_COLORS[task.priority] || 'default'}
              />
              {task.status !== 'Done' && (
                <Button
                  size="small"
                  variant="outlined"
                  color="success"
                  startIcon={<CheckCircleOutlineIcon fontSize="inherit" />}
                  onClick={(e) => { e.stopPropagation(); onComplete(task._id); }}
                  sx={{ fontSize: 11, py: 0.25, px: 1, minWidth: 0, lineHeight: 1.5 }}
                  component="span"
                >
                  Complete
                </Button>
              )}
              {task.dueDate && (
                <Box display="flex" alignItems="center" gap={0.5}>
                  <CalendarTodayIcon sx={{ fontSize: 12, color: overdue ? 'error.main' : 'text.secondary' }} />
                  <Typography variant="caption" color={overdue ? 'error.main' : 'text.secondary'} fontWeight={overdue ? 600 : 400}>
                    {formatDate(task.dueDate)}
                  </Typography>
                </Box>
              )}
              {task.assignee && (
                <Tooltip title={task.assignee.name || task.assignee.email || 'Assignee'}>
                  <Avatar
                    sx={{ width: 22, height: 22, fontSize: 11, ml: 'auto' }}
                    alt={task.assignee.name || task.assignee.email}
                  >
                    {(task.assignee.name || task.assignee.email || '?')[0].toUpperCase()}
                  </Avatar>
                </Tooltip>
              )}
            </Box>
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}
