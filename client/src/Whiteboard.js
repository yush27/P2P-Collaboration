import React, { useRef, useEffect, useState } from 'react';
import './Whiteboard.css';
const SERVER_URL = 'ws://localhost:8080';
const INITIAL_COLOR = '#000000';
const INITIAL_WIDTH = 3;
const ERASER_WIDTH_MULT = 1.8;

function Whiteboard(){ 
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const socketRef = useRef(null);
    const isPaintingRef = useRef(false);
    const lastPointRef = useRef({ x: 0, y: 0 });

    // State for user-controlled settings
    const [penColor, setPenColor] = useState(INITIAL_COLOR);
    const [penWidth, setPenWidth] = useState(INITIAL_WIDTH);
    const [currentTool, setCurrentTool] = useState('pencil');
    const [isConnected, setIsConnected] = useState(false);

    // Setup WebSocket Connection
    useEffect(() => {
        console.log('Attempting WebSocket connection...');
        const ws = new WebSocket(SERVER_URL);
        socketRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket Opened');
            setIsConnected(true);
        };

        ws.onclose = (event) => {
            console.log('WebSocket Closed:', event.code, event.reason);
            setIsConnected(false);
        };

        ws.onerror = (error) => {
            console.error('WebSocket Error:', error);
        };

        ws.onmessage = async (event) => {
            try {
                let messageText;
                if (event.data instanceof Blob) {
                    messageText = await event.data.text();
                } else {
                    messageText = event.data;
                }

                const messageData = JSON.parse(messageText);

                if (messageData.type === 'draw_segment' && contextRef.current) {
                    drawRemoteSegment(messageData.data);
                } else if (messageData.type === 'reset' && contextRef.current) {
                    clearCanvasLocally();
                }
            }
            catch(err){
                console.error('Failed receiving/processing message:', err);
            }
        };

        return () => {
            console.log('Closing WebSocket connection...');
            ws.close();
            setIsConnected(false);
        };

    }, []);

    // Setup Canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        if(!canvas) return;

        // canvas.width = 800;
        // canvas.height = 630;

        // Match internal drawing size to visual size
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;

        const ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        contextRef.current = ctx;
        console.log("Canvas context ready.");
        updateCanvasStyle(ctx, currentTool, penColor, penWidth);

    }, [currentTool, penColor, penWidth]);

    useEffect(() => {
        if(contextRef.current){
            updateCanvasStyle(contextRef.current, currentTool, penColor, penWidth);
        }
    }, [currentTool, penColor, penWidth]);

    const updateCanvasStyle = (ctx, tool, color, width) => {
        if (!ctx) return;
        const isEraser = tool === 'eraser';
        ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
        ctx.strokeStyle = isEraser ? '#000000' : color;
        ctx.lineWidth = isEraser ? width * ERASER_WIDTH_MULT : width;
    };

    // Drawing Event Handlers, get coordinates relative to canvas element
    const getCoords = (event) => {
        const canvas = canvasRef.current;
        if(!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        // Handle both mouse and touch events
        if(event.touches && event.touches.length > 0){
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        }
        else{
            clientX = event.clientX;
            clientY = event.clientY;
        }

        // Calculate position inside the canvas, considering CSS scaling
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;
        return { x, y };
    };

    // When mouse/touch starts
    const startPainting = (event) => {
        const coords = getCoords(event);
        const ctx = contextRef.current;
        if(!coords || !ctx) return;

        isPaintingRef.current = true;
        updateCanvasStyle(ctx, currentTool, penColor, penWidth);

        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
        lastPointRef.current = coords;

        // Prevent page scroll on touch devices
        if(event.touches) event.preventDefault();
    };

    // When mouse/touch ends
    const stopPainting = () => {
        if (!isPaintingRef.current) return;
        isPaintingRef.current = false;
        contextRef.current?.closePath();
    };

    // When mouse/touch moves
    const paint = (event) => {
        if(!isPaintingRef.current) return;

        const coords = getCoords(event);
        const ctx = contextRef.current;
        const socket = socketRef.current;
        if(!coords || !ctx || !socket) return;

        const currentPos = coords;
        const lastPos = lastPointRef.current;
        const tool = currentTool;

        // Data to send over WebSocket
        const drawData = {
            x0: lastPos.x, y0: lastPos.y,
            x1: currentPos.x, y1: currentPos.y,
            color: tool === 'eraser' ? '#000000' : penColor,
            lineWidth: tool === 'eraser' ? penWidth * ERASER_WIDTH_MULT : penWidth,
            tool: tool,
        };

        // Draw the segment locally
        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.stroke();

        // Send data if socket is connected
        if(socket.readyState === WebSocket.OPEN){
            socket.send(JSON.stringify({ type: 'draw_segment', data: drawData }));
        } 
        else{
            console.warn("Socket not open, couldn't send drawing");
        }

        // Update position for the next segment
        lastPointRef.current = currentPos;

        // Prevent page scroll on touch devices
        if(event.touches) event.preventDefault();
    };

    // Function to draw segments received from others
    const drawRemoteSegment = (data) => {
        const ctx = contextRef.current;
        if(!ctx) return; // Safety check

        // Save current user's drawing settings
        const originalStyle = ctx.strokeStyle;
        const originalWidth = ctx.lineWidth;
        const originalGCO = ctx.globalCompositeOperation;

        // Apply settings from the received data
        updateCanvasStyle(ctx, data.tool, data.color, data.lineWidth);

        // Draw the path segment
        ctx.beginPath();
        ctx.moveTo(data.x0, data.y0);
        ctx.lineTo(data.x1, data.y1);
        ctx.stroke();

        // IMPORTANT: Restore the original settings so local user isn't affected
        ctx.strokeStyle = originalStyle;
        ctx.lineWidth = originalWidth;
        ctx.globalCompositeOperation = originalGCO;
    };

    // Action Handlers
    const handleResetClick = () => {
        if(!window.confirm("Clear the canvas for everyone?")){
            return;
        }
        clearCanvasLocally();
        const socket = socketRef.current;
        if(socket && socket.readyState === WebSocket.OPEN){
            socket.send(JSON.stringify({ type: 'reset' }));
            console.log("Sent reset command.");
        } 
        else{
            console.warn("Socket not open, couldn't send reset.");
        }
    };

    const clearCanvasLocally = () => {
        const ctx = contextRef.current;
        const canvas = canvasRef.current;
        if(ctx && canvas){
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }


    // Render ui
    return(
        <div className="whiteboard-container">
            <h2 className="main-title">P2P-Collaboration</h2>
            <div className="toolbar">
                <div className="controls-group">
                    <button
                        onClick={() => setCurrentTool('pencil')}
                        disabled={currentTool === 'pencil'}
                        className="tool-button"
                    >
                        Pencil
                    </button>
                    <button
                        onClick={() => setCurrentTool('eraser')}
                        disabled={currentTool === 'eraser'}
                        className="tool-button"
                    >
                        Eraser
                    </button>
                </div>

                <div className="controls-group">
                    <label
                       htmlFor="colorPicker"
                       className={currentTool === 'eraser' ? 'disabled-label' : ''}
                    >
                       Color:
                    </label>
                    <input
                        id="colorPicker"
                        type="color"
                        value={penColor}
                        onChange={(e) => setPenColor(e.target.value)}
                        disabled={currentTool === 'eraser'}
                    />
                </div>

                 <div className="controls-group">
                    <label htmlFor="lineWidthSlider">Width:</label>
                    <input
                        id="lineWidthSlider"
                        type="range"
                        min="1"
                        max="50"
                        value={penWidth}
                        onChange={(e) => setPenWidth(parseInt(e.target.value, 10))}
                    />
                    <span className="line-width-display">
                        {Math.round(currentTool === 'eraser' ? penWidth * ERASER_WIDTH_MULT : penWidth)}
                    </span>
                </div>

                <div className="controls-group">
                    <button onClick={handleResetClick} className="action-button reset">
                       Reset All
                    </button>
                </div>
            </div>

            <div className={`status-indicator ${isConnected ? 'status-connected' : 'status-disconnected'}`}>
                Status: {isConnected ? 'Connected' : 'Disconnected'}
            </div>

            <canvas
                ref={canvasRef}
                onMouseDown={startPainting}
                onMouseUp={stopPainting}
                onMouseMove={paint}
                onMouseLeave={stopPainting}
                onTouchStart={startPainting}
                onTouchEnd={stopPainting}
                onTouchMove={paint}
                onTouchCancel={stopPainting}
                className="whiteboard-canvas"
            />
        </div>
    );
};

export default Whiteboard;