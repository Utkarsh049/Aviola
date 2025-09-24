const WebSocket = require('ws');
const http = require('http');

// Create HTTP server
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Store rooms and participants
const rooms = new Map();

function broadcastToRoom(roomId, message, excludeClient = null) {
  const room = rooms.get(roomId);
  if (room) {
    room.participants.forEach((client) => {
      if (client !== excludeClient && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}

function addClientToRoom(roomId, clientId, ws) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      participants: new Map(),
      createdAt: new Date(),
    });
  }
  
  const room = rooms.get(roomId);
  room.participants.set(clientId, ws);
  
  console.log(`Client ${clientId} joined room ${roomId}. Room size: ${room.participants.size}`);
  
  return room.participants.size;
}

function removeClientFromRoom(roomId, clientId) {
  const room = rooms.get(roomId);
  if (room) {
    room.participants.delete(clientId);
    console.log(`Client ${clientId} left room ${roomId}. Room size: ${room.participants.size}`);
    
    if (room.participants.size === 0) {
      rooms.delete(roomId);
      console.log(`Room ${roomId} deleted (empty)`);
    }
    
    return room.participants.size;
  }
  return 0;
}

wss.on('connection', (ws, req) => {
  let clientId = null;
  let roomId = null;
  
  console.log('New WebSocket connection');
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received message:', message.type, `from ${message.senderId || 'unknown'}`);
      
      switch (message.type) {
        case 'join-room':
          clientId = message.clientId;
          roomId = message.roomId;
          
          const participantCount = addClientToRoom(roomId, clientId, ws);
          
          // Send confirmation to the joining client
          ws.send(JSON.stringify({
            type: 'room-joined',
            roomId,
            participantCount,
          }));
          
          // Notify other participants
          broadcastToRoom(roomId, {
            type: 'participant-joined',
            clientId,
            participantCount,
          }, ws);
          
          break;
          
        case 'offer':
        case 'answer':
        case 'ice-candidate':
          // Forward signaling messages to the target client
          const room = rooms.get(message.roomId);
          if (room && message.targetId) {
            const targetClient = room.participants.get(message.targetId);
            if (targetClient && targetClient.readyState === WebSocket.OPEN) {
              targetClient.send(JSON.stringify(message));
            }
          }
          break;
          
        case 'chat-message':
          // Broadcast chat message to all participants in the room
          broadcastToRoom(message.roomId, {
            type: 'chat-message',
            message: message.message,
            messageId: message.messageId,
            senderId: message.senderId,
            timestamp: message.timestamp,
          }, ws);
          break;
          
        default:
          console.log('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
      }));
    }
  });
  
  ws.on('close', () => {
    console.log(`WebSocket connection closed for client ${clientId}`);
    if (clientId && roomId) {
      const participantCount = removeClientFromRoom(roomId, clientId);
      
      // Notify remaining participants
      broadcastToRoom(roomId, {
        type: 'participant-left',
        clientId,
        participantCount,
      });
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Cleanup empty rooms periodically
setInterval(() => {
  const now = new Date();
  rooms.forEach((room, roomId) => {
    if (room.participants.size === 0 && (now - room.createdAt) > 60000) {
      rooms.delete(roomId);
      console.log(`Cleaned up empty room: ${roomId}`);
    }
  });
}, 30000);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down signaling server...');
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('Shutting down signaling server...');
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
});