// client/src/hooks/useSocket.ts
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useDispatch } from 'react-redux';
import { taskUpdated, taskCreated, taskDeleted, taskReordered } from '../store/tasksSlice';

let socket: Socket | null = null;

export const useSocket = (projectId: string | null) => {
  const dispatch = useDispatch();
  const initialized = useRef(false);

  useEffect(() => {
    if (!projectId || initialized.current) return;

    const token = localStorage.getItem('token');
    socket = io(process.env.REACT_APP_API_URL!, {
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('[socket] Connected');
      socket?.emit('project:join', projectId);
    });

    socket.on('task:updated', (data) => {
      dispatch(taskUpdated(data));
    });

    socket.on('task:created', (task) => {
      dispatch(taskCreated(task));
    });

    socket.on('task:deleted', ({ taskId }) => {
      dispatch(taskDeleted(taskId));
    });

    socket.on('task:reordered', (data) => {
      dispatch(taskReordered(data));
    });

    socket.on('disconnect', () => {
      console.log('[socket] Disconnected');
    });

    initialized.current = true;

    return () => {
      socket?.emit('project:leave', projectId);
      socket?.disconnect();
      initialized.current = false;
    };
  }, [projectId, dispatch]);

  const emitTaskUpdate = (taskId: string, changes: object) => {
    socket?.emit('task:update', { taskId, changes, projectId });
  };

  const emitTaskReorder = (taskId: string, newPosition: number, newStatus: string) => {
    socket?.emit('task:reorder', { taskId, newPosition, newStatus, projectId });
  };

  return { emitTaskUpdate, emitTaskReorder };
};
