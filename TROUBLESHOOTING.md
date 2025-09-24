# Troubleshooting Guide

## Local Network Connection Issues

If you're experiencing issues with video not appearing when connecting from another device on the local network, follow these steps:

### 1. No External Setup Required

The app now uses Browser's BroadcastChannel API for local signaling - no Supabase or external services needed!

### 2. Enable Debug Mode

1. Open the video call interface
2. Click the "DBG" button in the bottom controls
3. Check the debug panel for connection status

### 3. Check Browser Console

Open browser developer tools (F12) and check the console for:

- ICE candidate generation
- Connection state changes
- Any error messages

### 4. Network Requirements

- Both devices must be on the same local network
- Firewall should allow WebRTC traffic
- Some corporate networks block WebRTC

### 5. Browser Compatibility

- Use Chrome, Firefox, or Edge
- Ensure WebRTC is enabled in browser settings
- Try incognito/private mode to avoid extension conflicts

### 6. Common Solutions

1. **Restart the connection**: Use the "Retry Connection" button
2. **Check room ID**: Ensure both devices use the exact same room ID
3. **Refresh the page**: Sometimes a simple refresh helps
4. **Try different browsers**: Some browsers handle WebRTC differently

### 7. Advanced Debugging

If issues persist:

1. Check if both devices can access the internet
2. Verify Supabase real-time is working (check network tab)
3. Try creating a new room ID
4. Check if your router supports UPnP or has NAT issues

### 8. How It Works Now

The app uses Browser's BroadcastChannel API which:

- Works automatically on the same local network
- No external servers or configuration needed
- Uses the same room ID to connect devices
- Handles WebRTC signaling locally

Just make sure both devices are on the same network and use the same room ID!
