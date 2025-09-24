# VideoConnect - Multi-Participant Video Calling App

A modern WebRTC-based video calling application that supports multiple participants across different devices on the same network.

## Features

- **Multi-participant video calls** - Support for multiple users in the same room
- **Cross-device connectivity** - Connect devices on the same local network
- **Real-time chat** - Built-in text messaging during calls
- **Modern UI** - Clean, responsive interface with glassmorphism effects
- **Local network optimized** - Works without external servers for local connections

## Quick Start

### Option 1: Full Setup (Recommended for multiple devices)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start both signaling server and app:**
   ```bash
   npm run dev:full
   ```

3. **Access the app:**
   - Open `http://localhost:5173` in your browser
   - Share this URL with others on the same network
   - Use the same Room ID to join the same call

### Option 2: Same-device only (fallback)

If you only need to test with multiple tabs on the same device:

```bash
npm run dev
```

## How It Works

### For Multiple Devices (Recommended)

1. **Signaling Server**: A local WebSocket server handles signaling between devices
2. **WebRTC**: Direct peer-to-peer connections for video/audio streams
3. **STUN Servers**: Help with NAT traversal for local network connections

### Architecture

```
Device A ←→ Signaling Server (localhost:8080) ←→ Device B
    ↓                                              ↓
    └────────── Direct WebRTC Connection ──────────┘
```

### For Same-device Testing

Falls back to BroadcastChannel API for communication between browser tabs.

## Usage

1. **Create a room**: Click "Create Room" to generate a unique room ID
2. **Join a room**: Enter an existing room ID and click "Join Room"
3. **Share the room ID**: Give the room ID to others to join your call
4. **Controls**:
   - Toggle video/audio
   - Open chat panel
   - View debug information
   - Leave call

## Network Requirements

- All devices must be on the same local network (WiFi/Ethernet)
- Firewall should allow WebRTC traffic
- Modern browser with WebRTC support (Chrome, Firefox, Edge, Safari)

## Troubleshooting

### Connection Issues

1. **Check the signaling server**: Make sure it's running on port 8080
2. **Verify network**: Ensure all devices are on the same network
3. **Browser permissions**: Allow camera/microphone access
4. **Firewall**: Check if WebRTC traffic is blocked
5. **Use debug mode**: Click "DBG" button to see connection details

### Common Solutions

- **Refresh the page** if connection fails
- **Try a different browser** (Chrome recommended)
- **Check browser console** for error messages
- **Restart the signaling server** if needed

### Manual Server Start

If you need to run the signaling server separately:

```bash
# Terminal 1: Start signaling server
npm run signaling

# Terminal 2: Start the app
npm run dev
```

## Development

### Project Structure

```
src/
├── components/
│   ├── RoomCreation.jsx    # Landing page with room creation/joining
│   └── VideoCall.tsx       # Main video call interface
├── hooks/
│   └── useWebRTC.ts        # WebRTC connection logic
├── types/
│   └── chat.ts            # Chat message types
└── lib/
    └── supabase.ts        # Legacy file (not used)

signaling-server.js         # WebSocket signaling server
```

### Key Technologies

- **React + TypeScript**: Frontend framework
- **WebRTC**: Real-time communication
- **WebSocket**: Signaling for connection setup
- **Tailwind CSS**: Styling
- **Vite**: Build tool

## Production Deployment

For production use, you'll need:

1. **HTTPS**: WebRTC requires secure connections
2. **TURN servers**: For connections across different networks
3. **Scalable signaling**: Replace the simple WebSocket server
4. **Authentication**: Add user management if needed

## License

MIT License - feel free to use this project as a starting point for your own video calling applications.