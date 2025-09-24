import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { ChatMessage } from '../types/chat';

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  connectionState: 'connecting' | 'connected' | 'disconnected';
  isConnected: boolean;
  participantCount: number;
  toggleVideo: () => void;
  toggleAudio: () => void;
  leaveCall: () => void;
  sendChatMessage?: (message: string) => void;
  onChatMessage?: (callback: (message: ChatMessage) => void) => void;
}

export const useWebRTC = (roomId: string): UseWebRTCReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [isConnected, setIsConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);
  const chatCallbackRef = useRef<((message: ChatMessage) => void) | null>(null);

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]
  };

  // Initialize media stream
  const initializeLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      setConnectionState('disconnected');
      return null;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    const peerConnection = new RTCPeerConnection(iceServers);
    
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: {
            candidate: event.candidate,
            roomId
          }
        });
      }
    };

    peerConnection.ontrack = (event) => {
      const [stream] = event.streams;
      setRemoteStream(stream);
      setConnectionState('connected');
      setIsConnected(true);
      setParticipantCount(2);
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      if (state === 'connected') {
        setConnectionState('connected');
        setIsConnected(true);
      } else if (state === 'disconnected' || state === 'failed') {
        setConnectionState('disconnected');
        setIsConnected(false);
        setParticipantCount(1);
        setRemoteStream(null);
      }
    };

    return peerConnection;
  }, [roomId]);

  // Initialize WebRTC connection
  const initializeConnection = useCallback(async () => {
    const stream = await initializeLocalStream();
    if (!stream) return;

    const peerConnection = createPeerConnection();
    peerConnectionRef.current = peerConnection;

    // Add local stream tracks to peer connection
    stream.getTracks().forEach(track => {
      peerConnection.addTrack(track, stream);
    });

    // Setup Supabase real-time channel for signaling
    const channel = supabase.channel(`room-${roomId}`, {
      config: {
        broadcast: { self: true }
      }
    });

    channelRef.current = channel;

    channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
      if (payload.roomId === roomId) {
        await peerConnection.setRemoteDescription(payload.offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        channel.send({
          type: 'broadcast',
          event: 'answer',
          payload: {
            answer,
            roomId
          }
        });
      }
    });

    channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
      if (payload.roomId === roomId) {
        await peerConnection.setRemoteDescription(payload.answer);
      }
    });

    channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
      if (payload.roomId === roomId && payload.candidate) {
        await peerConnection.addIceCandidate(payload.candidate);
      }
    });

    channel.on('broadcast', { event: 'chat-message' }, ({ payload }) => {
      if (payload.roomId === roomId && chatCallbackRef.current) {
        const message: ChatMessage = {
          id: payload.id,
          text: payload.text,
          sender: payload.sender,
          timestamp: new Date(payload.timestamp),
          isOwn: false
        };
        chatCallbackRef.current(message);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // Create and send offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        
        channel.send({
          type: 'broadcast',
          event: 'offer',
          payload: {
            offer,
            roomId
          }
        });
      }
    });

  }, [roomId, initializeLocalStream, createPeerConnection]);

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
  const sendChatMessage = useCallback((message: string) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'chat-message',
        payload: {
          id: Date.now().toString(),
          text: message,
          sender: 'Remote User',
          timestamp: new Date().toISOString(),
          roomId
        }
      });
    }
  }, [roomId]);

  // Leave call
  const leaveCall = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Unsubscribe from channel
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    // Reset state
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState('disconnected');
    setIsConnected(false);
    setParticipantCount(0);
  }, []);

  // Set chat message callback
  const onChatMessage = useCallback((callback: (message: ChatMessage) => void) => {
    chatCallbackRef.current = callback;
  }, []);

  // Initialize connection on mount
  useEffect(() => {
    initializeConnection();

    return () => {
      leaveCall();
    };
  }, [initializeConnection, leaveCall]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveCall();
    };
  }, [leaveCall]);

  return {
    localStream,
    remoteStream,
    connectionState,
    isConnected,
    participantCount,
    toggleVideo,
    toggleAudio,
    leaveCall,
    sendChatMessage,
    onChatMessage
  };
};