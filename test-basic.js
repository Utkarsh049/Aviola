import http from 'http';

console.log('Testing basic Node.js setup...');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World!');
});

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`Basic server running on port ${PORT}`);
});

// Exit after 3 seconds
setTimeout(() => {
  console.log('Test completed');
  server.close();
  process.exit(0);
}, 3000);
