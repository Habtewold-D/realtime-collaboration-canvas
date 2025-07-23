import React, { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Stage, Layer, Line, Circle, Text } from 'react-konva';
import { io } from 'socket.io-client';
import projectService from '../services/project.service';
import { API_URL } from '../services/api';
import authService from '../services/auth.service';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

const TOOL_PEN = 'pen';
const TOOL_ERASER = 'eraser';
const TOOL_BRUSH = 'brush';

function getInitials(email) {
  if (!email) return '';
  const [name] = email.split('@');
  return name.length > 2 ? name.slice(0, 2).toUpperCase() : name.toUpperCase();
}

const WhiteboardPage = () => {
  const { id: projectId } = useParams();
  const [lines, setLines] = useState([]); // {points, color, width, tool, userEmail}
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#222222');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState(TOOL_PEN);
  const [remoteCursors, setRemoteCursors] = useState({}); // { [clientId]: { x, y, color, email } }
  const [userList, setUserList] = useState([]); // [{ clientId, email }]
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const stageRef = useRef(null);
  const socketRef = useRef(null);
  const clientId = useRef(Math.random().toString(36).substr(2, 9));
  const myCursorColor = useRef('#' + Math.floor(Math.random()*16777215).toString(16));
  const user = authService.getCurrentUser();
  const userEmail = user?.email || 'anon';

  // Load lines from backend on mount
  useEffect(() => {
    projectService.getCanvasData(projectId)
      .then(res => {
        if (res.data && res.data.canvasData) {
          try {
            const json = typeof res.data.canvasData === 'string' ? JSON.parse(res.data.canvasData) : res.data.canvasData;
            setLines(json.lines || []);
          } catch (e) {
            console.error('[DEBUG] Failed to parse canvasData as JSON:', e, res.data.canvasData);
          }
        }
      })
      .catch(err => {
        console.log('[DEBUG] Error loading canvas data:', err?.response?.data?.msg || err.message);
      });
  }, [projectId]);

  // Save lines to backend
  const saveLines = (newLines) => {
    const data = JSON.stringify({ lines: newLines });
    projectService.saveCanvasData(projectId, data)
      .then(res => {
        //
      })
      .catch(err => {
        console.error('[DEBUG] Error saving canvas data:', err);
      });
  };

  // Socket.io setup for real-time collaboration
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    socket.emit('join-room', projectId);
    socket.emit('user-join', { projectId, clientId: clientId.current, email: userEmail });

    // Receive remote drawing
    socket.on('drawing', (data) => {
      if (data && data.line) {
        setLines(prev => [...prev, data.line]);
        setUndoStack(prev => [...prev, lines]); // For undo/redo sync
        setRedoStack([]);
      }
    });

    // Receive remote clear
    socket.on('clear', () => {
      setLines([]);
      setUndoStack([]);
      setRedoStack([]);
    });

    // Receive remote cursor
    socket.on('cursor', ({ sender, cursor }) => {
      setRemoteCursors(prev => ({ ...prev, [sender]: cursor }));
    });

    // Remove cursor on disconnect
    socket.on('user-disconnected', (sender) => {
      setRemoteCursors(prev => {
        const copy = { ...prev };
        delete copy[sender];
        return copy;
      });
      setUserList(prev => prev.filter(u => u.clientId !== sender));
    });

    // User list management
    socket.on('user-list', (users) => {
      setUserList(users);
    });
    socket.on('user-join', (user) => {
      setUserList(prev => {
        if (prev.some(u => u.clientId === user.clientId)) return prev;
        return [...prev, user];
      });
    });
    socket.on('user-leave', (user) => {
      setUserList(prev => prev.filter(u => u.clientId !== user.clientId));
    });

    // Announce myself
    socket.emit('user-join', { projectId, clientId: clientId.current, email: userEmail });

    return () => {
      socket.disconnect();
    };
  }, [projectId, userEmail]);

  // Drawing handlers
  const handleMouseDown = (e) => {
    setIsDrawing(true);
    setUndoStack(prev => [...prev, lines]);
    setRedoStack([]);
    const pos = e.target.getStage().getPointerPosition();
    const newLine = {
      points: [pos.x, pos.y],
      color: tool === TOOL_ERASER ? '#fff' : (tool === TOOL_BRUSH ? penColor : penColor),
      width: tool === TOOL_BRUSH ? brushSize * 2 : brushSize,
      tool,
      clientId: clientId.current,
      email: userEmail
    };
    setLines([...lines, newLine]);
    // Emit start of new line
    if (socketRef.current) {
      socketRef.current.emit('drawing', { projectId, data: { line: newLine } });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    setLines(prevLines => {
      const lastLine = prevLines[prevLines.length - 1];
      if (!lastLine) return prevLines;
      const updatedLine = {
        ...lastLine,
        points: lastLine.points.concat([point.x, point.y])
      };
      const newLines = prevLines.slice(0, -1).concat(updatedLine);
      // Emit updated line
      if (socketRef.current) {
        socketRef.current.emit('drawing', { projectId, data: { line: updatedLine } });
      }
      return newLines;
    });
    // Emit cursor position
    if (socketRef.current) {
      socketRef.current.emit('cursor', {
        projectId,
        cursor: { x: point.x, y: point.y, color: myCursorColor.current, email: userEmail }
      });
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    saveLines(lines);
  };

  const handleClear = () => {
    setUndoStack(prev => [...prev, lines]);
    setRedoStack([]);
    setLines([]);
    saveLines([]);
    if (socketRef.current) {
      socketRef.current.emit('clear', { projectId });
    }
  };

  // Undo/Redo handlers
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    setRedoStack(prev => [lines, ...prev]);
    const prevLines = undoStack[undoStack.length - 1];
    setUndoStack(undoStack.slice(0, -1));
    setLines(prevLines);
    saveLines(prevLines);
    if (socketRef.current) {
      // Optionally broadcast undo
      // socketRef.current.emit('undo', { projectId, lines: prevLines });
    }
  };
  const handleRedo = () => {
    if (redoStack.length === 0) return;
    setUndoStack(prev => [...prev, lines]);
    const nextLines = redoStack[0];
    setRedoStack(redoStack.slice(1));
    setLines(nextLines);
    saveLines(nextLines);
    if (socketRef.current) {
      // Optionally broadcast redo
      // socketRef.current.emit('redo', { projectId, lines: nextLines });
    }
  };

  // Tool selector
  const handleToolChange = (newTool) => {
    setTool(newTool);
  };

  // Render remote cursors with email labels only
  const renderRemoteCursors = () => {
    return Object.entries(remoteCursors).map(([id, cursor]) => (
      <React.Fragment key={id}>
        <Circle
          x={cursor.x}
          y={cursor.y}
          radius={8}
          fill={cursor.color || '#00f'}
          opacity={0.5}
          listening={false}
        />
        <Text
          x={cursor.x + 10}
          y={cursor.y - 10}
          text={cursor.email || ''}
          fontSize={14}
          fill={cursor.color || '#00f'}
          fontStyle="bold"
          listening={false}
        />
      </React.Fragment>
    ));
  };

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div style={{ margin: '2rem 0 1rem 0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button onClick={() => handleToolChange(TOOL_PEN)} style={{ padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', background: tool === TOOL_PEN ? '#667eea' : '#eee', color: tool === TOOL_PEN ? '#fff' : '#222', fontWeight: 600, cursor: 'pointer' }}>Pen</button>
        <button onClick={() => handleToolChange(TOOL_ERASER)} style={{ padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', background: tool === TOOL_ERASER ? '#e74c3c' : '#eee', color: tool === TOOL_ERASER ? '#fff' : '#222', fontWeight: 600, cursor: 'pointer' }}>Eraser</button>
        <button onClick={() => handleToolChange(TOOL_BRUSH)} style={{ padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', background: tool === TOOL_BRUSH ? '#764ba2' : '#eee', color: tool === TOOL_BRUSH ? '#fff' : '#222', fontWeight: 600, cursor: 'pointer' }}>Brush</button>
        <label style={{ display: tool !== TOOL_ERASER ? 'flex' : 'none', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
          Color
          <input type="color" value={penColor} onChange={e => setPenColor(e.target.value)} style={{ width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
          Size
          <input type="range" min={1} max={30} value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} />
          <span style={{ minWidth: 24, textAlign: 'center' }}>{brushSize}</span>
        </label>
        <button onClick={handleClear} style={{ padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', background: '#e74c3c', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Clear</button>
      </div>
      <div style={{ position: 'relative' }}>
        <Stage
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          ref={stageRef}
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            borderRadius: 16,
            boxShadow: '0 8px 32px rgba(102,126,234,0.13)',
            background: '#fff',
            display: 'block',
            cursor: isDrawing ? 'crosshair' : 'default'
          }}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
        >
          <Layer>
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.tool === TOOL_ERASER ? '#fff' : line.color}
                strokeWidth={line.width}
                tension={0.5}
                lineCap="round"
                globalCompositeOperation={line.tool === TOOL_ERASER ? 'destination-out' : 'source-over'}
                lineJoin="round"
              />
            ))}
            {renderRemoteCursors()}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};

export default WhiteboardPage; 