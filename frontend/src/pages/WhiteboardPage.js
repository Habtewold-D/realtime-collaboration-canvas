import React, { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Stage, Layer, Line } from 'react-konva';
import projectService from '../services/project.service';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;

const WhiteboardPage = () => {
  const { id: projectId } = useParams();
  const [lines, setLines] = useState([]); // {points, color, width}
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#222222');
  const [brushSize, setBrushSize] = useState(3);
  const stageRef = useRef(null);

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
        console.log('[DEBUG] Backend save response:', res.data);
      })
      .catch(err => {
        console.error('[DEBUG] Error saving canvas data:', err);
      });
  };

  // Drawing handlers
  const handleMouseDown = (e) => {
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { points: [pos.x, pos.y], color: penColor, width: brushSize }]);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    setLines(prevLines => {
      const lastLine = prevLines[prevLines.length - 1];
      const newLines = prevLines.slice(0, -1).concat({
        ...lastLine,
        points: lastLine.points.concat([point.x, point.y])
      });
      return newLines;
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    saveLines(lines);
  };

  const handleClear = () => {
    setLines([]);
    saveLines([]);
  };

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div style={{ margin: '2rem 0 1rem 0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
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
                stroke={line.color}
                strokeWidth={line.width}
                tension={0.5}
                lineCap="round"
                globalCompositeOperation="source-over"
                lineJoin="round"
              />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
};

export default WhiteboardPage; 