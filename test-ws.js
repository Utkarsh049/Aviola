import { WebSocketServer } from 'ws';
import http from 'http';

console.log('Testing WebSocket import...');
console.log('WebSocketServer:', typeof WebSocketServer);

const server = http.createServer();
const wss = new WebSocketServer({ server });

console.log('WebSocket server created successfully');

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});

// Exit after 2 seconds
setTimeout(() => {
  console.log('Test completed');
  process.exit(0);
}, 2000);
