const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;

// Native Node.js static file server
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Normalize request path
  let filePath = '.' + req.url.split('?')[0];
  if (filePath === './') {
    filePath = './index.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Sorry, check with the site admin for error: ${error.code} ..\n`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

// Create WebSocket server attached to the HTTP server
const wss = new WebSocketServer({ server });

// Room management map (key: roomCode, value: list of websocket clients)
const rooms = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

wss.on('connection', (ws) => {
  ws.roomCode = null;
  ws.playerIndex = null; // 1 or 2

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'CREATE_ROOM': {
          let code = generateRoomCode();
          // Ensure uniqueness
          while (rooms.has(code)) {
            code = generateRoomCode();
          }

          ws.roomCode = code;
          ws.playerIndex = 1;
          rooms.set(code, [ws]);

          ws.send(JSON.stringify({ 
            type: 'ROOM_CREATED', 
            roomCode: code,
            playerIndex: 1 
          }));
          console.log(`[ROOM CREATED] Code: ${code}`);
          break;
        }

        case 'JOIN_ROOM': {
          const code = String(data.roomCode).toUpperCase().trim();
          
          if (!rooms.has(code)) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found.' }));
            return;
          }

          const clients = rooms.get(code);
          if (clients.length >= 2) {
            ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is full.' }));
            return;
          }

          ws.roomCode = code;
          ws.playerIndex = 2;
          clients.push(ws);

          ws.send(JSON.stringify({ 
            type: 'ROOM_JOINED', 
            roomCode: code,
            playerIndex: 2 
          }));

          // Notify player 1 that opponent has joined
          const p1 = clients[0];
          p1.send(JSON.stringify({ 
            type: 'OPPONENT_JOINED', 
            opponentIndex: 2 
          }));
          
          // Notify player 2 of player 1 presence
          ws.send(JSON.stringify({
            type: 'OPPONENT_JOINED',
            opponentIndex: 1
          }));

          console.log(`[ROOM JOINED] Player 2 joined code: ${code}`);
          break;
        }

        case 'SYNC_STATE':
        case 'SPAWN_HAZARD':
        case 'COLLECT_ITEM':
        case 'LAP_COMPLETE':
        case 'FINISH_RACE': {
          // Forward these messages to the other peer in the room
          if (ws.roomCode && rooms.has(ws.roomCode)) {
            const clients = rooms.get(ws.roomCode);
            clients.forEach(client => {
              if (client !== ws && client.readyState === ws.OPEN) {
                client.send(JSON.stringify(data));
              }
            });
          }
          break;
        }

        case 'QUIT_RACE': {
          handleDisconnect(ws);
          break;
        }

        default:
          break;
      }
    } catch (err) {
      console.error('Error handling message:', err);
    }
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });
});

function handleDisconnect(ws) {
  if (ws.roomCode && rooms.has(ws.roomCode)) {
    const clients = rooms.get(ws.roomCode);
    const index = clients.indexOf(ws);
    if (index > -1) {
      clients.splice(index, 1);
    }

    console.log(`[DISCONNECT] Player ${ws.playerIndex} disconnected from room: ${ws.roomCode}`);

    if (clients.length > 0) {
      // Notify remaining player that opponent disconnected
      clients.forEach(client => {
        if (client.readyState === ws.OPEN) {
          client.send(JSON.stringify({ type: 'OPPONENT_LEFT' }));
        }
      });
      // Reset remaining client state
      clients[0].roomCode = null;
      clients[0].playerIndex = null;
    }
    
    // Clear room if empty
    rooms.delete(ws.roomCode);
    ws.roomCode = null;
    ws.playerIndex = null;
  }
}

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(` Shivu Kart Adventure Web Server & WebSockets active`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
