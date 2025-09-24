import { useState, useEffect, useRef, useCallback } from "react";
import { ChatMessage } from "../types/chat";

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStreams: MediaStream[];
  connectionState: "connecting" | "connected" | "disconnected";
  isConnected: boolean;
  participantCount: number;
  toggleVideo: () => void;
  toggleAudio: () => void;
  leaveCall: () => void;
  sendChatMessage?: (message: string) => void;
  onChatMessage?: (callback: (message: ChatMessage) => void) => void;
  retryConnection: () => void;
  connectionError: string | null;
}

interface PeerConnection {
  id: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

export const useWebRTC = (roomId: string): UseWebRTCReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<MediaStream[]>([]);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [isConnected, setIsConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const chatCallbackRef = useRef<((message: ChatMessage) => void) | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clientIdRef = useRef<string>(Math.random().toString(36).substr(2, 9));
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5;

  // ICE servers configuration optimized for local networks
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun.ekiga.net" },
      { urls: "stun:stun.stunprotocol.org:3478" },
    ],
    iceCandidatePoolSize: 10,
  };

  // Initialize media stream
  const initializeLocalStream = useCallback(async () => {
    try {
      console.log("Requesting media devices...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      console.log("Media devices accessed successfully");
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setConnectionError("Failed to access camera/microphone. Please check permissions.");
      setConnectionState("disconnected");
      return null;
    }
  }, []);

  // Create peer connection for a specific peer
  const createPeerConnection = useCallback((peerId: string) => {
    console.log(`Creating peer connection for ${peerId}`);
    const peerConnection = new RTCPeerConnection(iceServers);

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "ice-candidate",
          candidate: event.candidate,
          targetId: peerId,
          senderId: clientIdRef.current,
          roomId,
        }));
      }
    };

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log(`Received remote track from ${peerId}`);
      const [stream] = event.streams;
      
      setRemoteStreams(prev => {
        const filtered = prev.filter(s => s.id !== stream.id);
        return [...filtered, stream];
      });

      // Update peer connection with stream
      const peerConn = peerConnectionsRef.current.get(peerId);
      if (peerConn) {
        peerConn.stream = stream;
        peerConnectionsRef.current.set(peerId, peerConn);
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log(`Peer ${peerId} connection state: ${state}`);
      
      if (state === "connected") {
        setConnectionState("connected");
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
      } else if (state === "disconnected" || state === "failed") {
        // Remove this peer's stream
        const peerConn = peerConnectionsRef.current.get(peerId);
        if (peerConn?.stream) {
          setRemoteStreams(prev => prev.filter(s => s.id !== peerConn.stream!.id));
        }
        
        // Remove peer connection
        peerConnectionsRef.current.delete(peerId);
        
        // Update participant count
        setParticipantCount(peerConnectionsRef.current.size + 1);
        
        if (peerConnectionsRef.current.size === 0) {
          setConnectionState("disconnected");
          setIsConnected(false);
        }
      }
    };

    return peerConnection;
  }, [roomId]);

  // Setup WebSocket signaling server (simple local server)
  const setupSignaling = useCallback(() => {
    // For local development, we'll use a simple WebSocket server
    // In production, you'd want to use a proper signaling server
    const wsUrl = `ws://localhost:8080/room/${roomId}`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        
        // Join room
        ws.send(JSON.stringify({
          type: "join-room",
          roomId,
          clientId: clientIdRef.current,
        }));
      };

      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        console.log("Received message:", data.type, data);

        switch (data.type) {
          case "room-joined":
            console.log("Successfully joined room");
            setParticipantCount(data.participantCount || 1);
            break;

          case "participant-joined":
            if (data.clientId !== clientIdRef.current) {
              console.log(`New participant joined: ${data.clientId}`);
              setParticipantCount(data.participantCount || 1);
              
              // Create offer for new participant
              const peerConnection = createPeerConnection(data.clientId);
              peerConnectionsRef.current.set(data.clientId, {
                id: data.clientId,
                connection: peerConnection,
              });

              const offer = await peerConnection.createOffer();
              await peerConnection.setLocalDescription(offer);
              
              ws.send(JSON.stringify({
                type: "offer",
                offer,
                targetId: data.clientId,
                senderId: clientIdRef.current,
                roomId,
              }));
            }
            break;

          case "participant-left":
            console.log(`Participant left: ${data.clientId}`);
            const peerConn = peerConnectionsRef.current.get(data.clientId);
            if (peerConn) {
              peerConn.connection.close();
              if (peerConn.stream) {
                setRemoteStreams(prev => prev.filter(s => s.id !== peerConn.stream!.id));
              }
              peerConnectionsRef.current.delete(data.clientId);
            }
            setParticipantCount(data.participantCount || 1);
            break;

          case "offer":
            if (data.targetId === clientIdRef.current) {
              console.log(`Received offer from ${data.senderId}`);
              const peerConnection = createPeerConnection(data.senderId);
              peerConnectionsRef.current.set(data.senderId, {
                id: data.senderId,
                connection: peerConnection,
              });

              await peerConnection.setRemoteDescription(data.offer);
              const answer = await peerConnection.createAnswer();
              await peerConnection.setLocalDescription(answer);

              ws.send(JSON.stringify({
                type: "answer",
                answer,
                targetId: data.senderId,
                senderId: clientIdRef.current,
                roomId,
              }));
            }
            break;

          case "answer":
            if (data.targetId === clientIdRef.current) {
              console.log(`Received answer from ${data.senderId}`);
              const peerConn = peerConnectionsRef.current.get(data.senderId);
              if (peerConn) {
                await peerConn.connection.setRemoteDescription(data.answer);
              }
            }
            break;

          case "ice-candidate":
            if (data.targetId === clientIdRef.current) {
              console.log(`Received ICE candidate from ${data.senderId}`);
              const peerConn = peerConnectionsRef.current.get(data.senderId);
              if (peerConn && data.candidate) {
                await peerConn.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
              }
            }
            break;

          case "chat-message":
            if (data.senderId !== clientIdRef.current && chatCallbackRef.current) {
              const message: ChatMessage = {
                id: data.messageId,
                text: data.message,
                sender: `User ${data.senderId.slice(0, 6)}`,
                timestamp: new Date(data.timestamp),
                isOwn: false,
              };
              chatCallbackRef.current(message);
            }
            break;

          case "error":
            console.error("Server error:", data.message);
            setConnectionError(data.message);
            break;
        }
      };

      ws.onclose = () => {
        console.log("WebSocket disconnected");
        setConnectionState("disconnected");
        setIsConnected(false);
        
        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`Reconnection attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
          setTimeout(() => {
            if (wsRef.current?.readyState !== WebSocket.OPEN) {
              setupSignaling();
            }
          }, 2000 * reconnectAttemptsRef.current);
        } else {
          setConnectionError("Connection lost. Please refresh the page to reconnect.");
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setConnectionError("Failed to connect to signaling server. Make sure the server is running on localhost:8080");
      };

    } catch (error) {
      console.error("Failed to setup WebSocket:", error);
      setConnectionError("Failed to setup connection. Using fallback BroadcastChannel for same-device connections.");
      setupBroadcastChannelFallback();
    }
  }, [roomId, createPeerConnection]);

  // Fallback to BroadcastChannel for same-device connections
  const setupBroadcastChannelFallback = useCallback(() => {
    console.log("Setting up BroadcastChannel fallback");
    const channel = new BroadcastChannel(`room-${roomId}`);
    
    channel.onmessage = async (event) => {
      const data = event.data;
      if (data.senderId === clientIdRef.current) return;
      
      console.log("BroadcastChannel message:", data.type);
      
      // Handle similar to WebSocket messages but for same-device only
      switch (data.type) {
        case "join-room":
          // Send back a participant-joined message
          channel.postMessage({
            type: "participant-joined",
            clientId: clientIdRef.current,
            senderId: clientIdRef.current,
          });
          break;
          
        case "participant-joined":
          if (!peerConnectionsRef.current.has(data.clientId)) {
            const peerConnection = createPeerConnection(data.clientId);
            peerConnectionsRef.current.set(data.clientId, {
              id: data.clientId,
              connection: peerConnection,
            });

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            
            channel.postMessage({
              type: "offer",
              offer,
              targetId: data.clientId,
              senderId: clientIdRef.current,
            });
          }
          break;
          
        // Handle other message types similar to WebSocket
      }
    };
    
    // Announce presence
    channel.postMessage({
      type: "join-room",
      clientId: clientIdRef.current,
      senderId: clientIdRef.current,
    });
  }, [roomId, createPeerConnection]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
      }
    }
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
      }
    }
  }, []);

  // Send chat message
  const sendChatMessage = useCallback(
    (message: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "chat-message",
          message,
          messageId: Date.now().toString(),
          senderId: clientIdRef.current,
          timestamp: new Date().toISOString(),
          roomId,
        }));
      }
    },
    [roomId]
  );

  // Leave call
  const leaveCall = useCallback(() => {
    console.log("Leaving call...");

    // Clear retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach((peerConn) => {
      peerConn.connection.close();
    });
    peerConnectionsRef.current.clear();

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Reset state
    setLocalStream(null);
    setRemoteStreams([]);
    setConnectionState("disconnected");
    setIsConnected(false);
    setParticipantCount(0);
    setConnectionError(null);
    reconnectAttemptsRef.current = 0;
  }, []);

  // Retry connection
  const retryConnection = useCallback(() => {
    console.log("Retrying connection...");
    setConnectionError(null);
    setConnectionState("connecting");
    reconnectAttemptsRef.current = 0;

    // Clean up existing connections
    peerConnectionsRef.current.forEach((peerConn) => {
      peerConn.connection.close();
    });
    peerConnectionsRef.current.clear();
    setRemoteStreams([]);

    if (wsRef.current) {
      wsRef.current.close();
    }

    // Retry after a short delay
    retryTimeoutRef.current = setTimeout(() => {
      setupSignaling();
    }, 1000);
  }, [setupSignaling]);

  // Set chat message callback
  const onChatMessage = useCallback(
    (callback: (message: ChatMessage) => void) => {
      chatCallbackRef.current = callback;
    },
    []
  );

  // Initialize connection on mount
  useEffect(() => {
    const initialize = async () => {
      const stream = await initializeLocalStream();
      if (stream) {
        setupSignaling();
      }
    };

    initialize();

    return () => {
      leaveCall();
    };
  }, [initializeLocalStream, setupSignaling, leaveCall]);

  return {
    localStream,
    remoteStreams,
    connectionState,
    isConnected,
    participantCount,
    toggleVideo,
    toggleAudio,
    leaveCall,
    sendChatMessage,
    onChatMessage,
    retryConnection,
    connectionError,
  };
};