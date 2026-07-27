import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Box, Typography } from '@mui/material';
import TaskCard from './TaskCard';

const COLUMN_COLORS = {
  Backlog: '#94a3b8',
  'To Do': '#3b82f4',
  'In Progress': '#f59e0b',
  Blocked: '#ef4444',
  Done: '#22c55e',
};

export default function KanbanColumn({ status, tasks, onViewTask, onDeleteTask, onCompleteTask, isAdmin, mobile }) {
  return (
    <Box
      sx={{
        width: mobile ? '100%' : 270,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
      }}
    >
      {/* Column header */}
      <Box
        sx={{
          p: 1.5,
          borderBottom: '2px solid',
          borderColor: COLUMN_COLORS[status] || 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="subtitle2" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>
          {status}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            bgcolor: COLUMN_COLORS[status],
            color: '#fff',
            borderRadius: '12px',
            px: 1,
            py: 0.25,
            fontWeight: 600,
          }}
        >
          {tasks.length}
        </Typography>
      </Box>

      {/* Task list area */}
      {mobile ? (
        <Box
          sx={{
            p: 1,
            flexGrow: 1,
            minHeight: 100,
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 280px)',
          }}
        >
          {tasks.map((task, idx) => (
            <TaskCard
              key={task._id}
              task={task}
              index={idx}
              onView={onViewTask}
              onDelete={onDeleteTask}
              onComplete={onCompleteTask}
              isAdmin={isAdmin}
              mobile
            />
          ))}
        </Box>
      ) : (
        <Droppable droppableId={status}>
          {(provided, snapshot) => (
            <Box
              ref={provided.innerRef}
              {...provided.droppableProps}
              sx={{
                p: 1,
                flexGrow: 1,
                minHeight: 100,
                bgcolor: snapshot.isDraggingOver
                  ? 'action.hover'
                  : 'transparent',
                transition: 'background-color 0.2s',
                overflowY: 'auto',
                maxHeight: 'calc(100vh - 280px)',
              }}
            >
              {tasks.map((task, idx) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  index={idx}
                  onView={onViewTask}
                  onDelete={onDeleteTask}
                  onComplete={onCompleteTask}
                  isAdmin={isAdmin}
                />
              ))}
              {provided.placeholder}
            </Box>
          )}
        </Droppable>
      )}

    </Box>
  );
}
