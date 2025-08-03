import React, { useRef, useState, useEffect } from 'react';
import { Stage, Layer, Line, Circle, Text } from 'react-konva';
import { io } from 'socket.io-client';
import { API_URL } from '../services/api';
import authService from '../services/auth.service';
import { useNavigate } from 'react-router-dom';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;
const SOCKET_URL = API_URL.replace(/\/api\/?$/, '');

const TOOL_PEN = 'pen';
const TOOL_ERASER = 'eraser';
const TOOL_BRUSH = 'brush';

const PUBLIC_ROOM_ID = 'public-canvas';

function getInitials(email) {
  if (!email) return '';
  const [name] = email.split('@');
  return name.length > 2 ? name.slice(0, 2).toUpperCase() : name.toUpperCase();
}

const PublicWhiteboardPage = () => {
  const [lines, setLines] = useState([]); // {points, color, width, tool, userEmail}
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#222222');
  const [brushSize, setBrushSize] = useState(3);
  const [tool, setTool] = useState(TOOL_PEN);
  const [remoteCursors, setRemoteCursors] = useState({}); // { [clientId]: { x, y, color, email } }
  const [userList, setUserList] = useState([]); // [{ clientId, email }]
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const stageRef = useRef(null);
  const socketRef = useRef(null);
  const clientId = useRef(Math.random().toString(36).substr(2, 9));
  const myCursorColor = useRef('#' + Math.floor(Math.random()*16777215).toString(16));
  const user = authService.getCurrentUser();
  const userEmail = user?.email || 'Anonymous';
  const navigate = useNavigate();

  // Socket.io setup for real-time collaboration
  useEffect(() => {
    const socket = io(SOCKET_URL);
    socketRef.current = socket;
    socket.emit('join-room', PUBLIC_ROOM_ID);
    socket.emit('user-join', { projectId: PUBLIC_ROOM_ID, clientId: clientId.current, email: userEmail });

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
        const newCursors = { ...prev };
        delete newCursors[sender];
        return newCursors;
      });
    });

    // Update user list
    socket.on('user-list', (users) => {
      setUserList(users);
    });

    return () => {
      socket.disconnect();
    };
  }, [userEmail]);

  // Save lines to localStorage for public canvas
  const saveLines = (newLines) => {
    try {
      localStorage.setItem('public-canvas-data', JSON.stringify({ lines: newLines }));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  };

  // Load lines from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('public-canvas-data');
      if (saved) {
        const data = JSON.parse(saved);
        setLines(data.lines || []);
      }
    } catch (e) {
      console.error('Error loading from localStorage:', e);
    }
  }, []);

  const handleMouseDown = (e) => {
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { points: [pos.x, pos.y], color: penColor, width: brushSize, tool, userEmail }]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];
    lastLine.points = lastLine.points.concat([point.x, point.y]);
    lines.splice(lines.length - 1, 1, lastLine);
    setLines([...lines]);

    // Send cursor position
    if (socketRef.current) {
      socketRef.current.emit('cursor', {
        projectId: PUBLIC_ROOM_ID,
        cursor: { x: point.x, y: point.y, color: myCursorColor.current, email: userEmail }
      });
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setUndoStack([...undoStack, lines]);
    setRedoStack([]);
    saveLines(lines);

    // Broadcast drawing
    if (socketRef.current) {
      socketRef.current.emit('drawing', {
        projectId: PUBLIC_ROOM_ID,
        line: lines[lines.length - 1]
      });
    }
  };

  const handleClear = () => {
    setLines([]);
    setUndoStack([]);
    setRedoStack([]);
    saveLines([]);

    if (socketRef.current) {
      socketRef.current.emit('clear', { projectId: PUBLIC_ROOM_ID });
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    setRedoStack([lines, ...redoStack]);
    const previousLines = undoStack[undoStack.length - 1];
    setUndoStack(undoStack.slice(0, -1));
    setLines(previousLines);
    saveLines(previousLines);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    setUndoStack(prev => [...prev, lines]);
    const nextLines = redoStack[0];
    setRedoStack(redoStack.slice(1));
    setLines(nextLines);
    saveLines(nextLines);
  };

  // Tool selector
  const handleToolChange = (newTool) => {
    setTool(newTool);
  };

  // Handle invite action - show login prompt
  const handleInvite = () => {
    setShowLoginPrompt(true);
  };

  // Handle login navigation
  const handleLogin = () => {
    navigate('/login');
  };

  // Handle register navigation
  const handleRegister = () => {
    navigate('/register');
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
      <div style={{ margin: '2rem 0 1rem 0', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
        <button onClick={handleUndo} disabled={undoStack.length === 0} style={{ padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', background: undoStack.length === 0 ? '#ccc' : '#667eea', color: '#fff', fontWeight: 600, cursor: undoStack.length === 0 ? 'not-allowed' : 'pointer' }}>Undo</button>
        <button onClick={handleRedo} disabled={redoStack.length === 0} style={{ padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', background: redoStack.length === 0 ? '#ccc' : '#667eea', color: '#fff', fontWeight: 600, cursor: redoStack.length === 0 ? 'not-allowed' : 'pointer' }}>Redo</button>
        <button onClick={handleInvite} style={{ padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', background: '#28a745', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Invite Others</button>
        {user ? (
          <button onClick={() => navigate('/dashboard')} style={{ padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', background: '#6c757d', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>My Projects</button>
        ) : (
          <button onClick={handleLogin} style={{ padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', background: '#6c757d', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Login</button>
        )}
      </div>

      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#fff',
            padding: '2rem',
            borderRadius: 12,
            maxWidth: 400,
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginBottom: '1rem', color: '#333' }}>Login Required</h3>
            <p style={{ marginBottom: '1.5rem', color: '#666' }}>
              To invite others to collaborate, you need to create an account or login.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={handleLogin} style={{ padding: '0.75rem 1.5rem', borderRadius: 8, border: 'none', background: '#667eea', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                Login
              </button>
              <button onClick={handleRegister} style={{ padding: '0.75rem 1.5rem', borderRadius: 8, border: 'none', background: '#28a745', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                Register
              </button>
              <button onClick={() => setShowLoginPrompt(false)} style={{ padding: '0.75rem 1.5rem', borderRadius: 8, border: 'none', background: '#6c757d', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* User info */}
      <div style={{ marginTop: '1rem', color: '#fff', textAlign: 'center' }}>
        <p>Drawing as: {userEmail}</p>
        {userList.length > 1 && (
          <p>Active users: {userList.length}</p>
        )}
      </div>
    </div>
  );
};

export default PublicWhiteboardPage; 