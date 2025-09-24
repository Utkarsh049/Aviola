import { useState, useEffect, useRef, useCallback } from "react";
import { ChatMessage } from "../types/chat";

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
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

export const useWebRTC = (roomId: string): UseWebRTCReturn => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [isConnected, setIsConnected] = useState(false);
  const [participantCount, setParticipantCount] = useState(1);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const chatCallbackRef = useRef<((message: ChatMessage) => void) | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitiatorRef = useRef<boolean>(false);
  const remoteDescriptionSetRef = useRef<boolean>(false);
  const queuedIceCandidatesRef = useRef<any[]>([]);

  // ICE servers configuration with better local network support
  const iceServers = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },
      // Add local network STUN servers
      { urls: "stun:stun.ekiga.net" },
      { urls: "stun:stun.ideasip.com" },
      { urls: "stun:stun.schlund.de" },
      { urls: "stun:stun.stunprotocol.org:3478" },
      { urls: "stun:stun.voiparound.com" },
      { urls: "stun:stun.voipbuster.com" },
      { urls: "stun:stun.voipstunt.com" },
      { urls: "stun:stun.counterpath.com" },
      { urls: "stun:stun.1und1.de" },
      { urls: "stun:stun.gmx.net" },
      { urls: "stun:stun.callwithus.com" },
      { urls: "stun:stun.counterpath.net" },
      { urls: "stun:stun.internetcalls.com" },
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
      console.log("Media devices accessed successfully:", stream);
      setLocalStream(stream);
      localStreamRef.current = stream;
      return stream;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setConnectionState("disconnected");
      return null;
    }
  }, []);

  // Process queued ICE candidates
  const processQueuedIceCandidates = useCallback(async () => {
    if (!peerConnectionRef.current || !remoteDescriptionSetRef.current) return;

    console.log(
      "Processing queued ICE candidates:",
      queuedIceCandidatesRef.current.length
    );
    for (const candidateData of queuedIceCandidatesRef.current) {
      try {
        const iceCandidate = new RTCIceCandidate({
          candidate: candidateData.candidate,
          sdpMid: candidateData.sdpMid,
          sdpMLineIndex: candidateData.sdpMLineIndex,
          usernameFragment: candidateData.usernameFragment,
        });
        await peerConnectionRef.current!.addIceCandidate(iceCandidate);
        console.log("Queued ICE candidate added successfully");
      } catch (error) {
        console.error("Error adding queued ICE candidate:", error);
      }
    }
    queuedIceCandidatesRef.current = [];
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback(() => {
    const peerConnection = new RTCPeerConnection(iceServers);

    // Enhanced logging for debugging
    peerConnection.onicecandidate = (event) => {
      console.log("ICE candidate generated:", event.candidate);
      if (event.candidate && broadcastChannelRef.current) {
        console.log("Sending ICE candidate:", event.candidate);
        // Serialize the ICE candidate for BroadcastChannel
        const candidateData = {
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          usernameFragment: event.candidate.usernameFragment,
        };
        broadcastChannelRef.current.postMessage({
          type: "ice-candidate",
          candidate: candidateData,
          roomId,
        });
      } else {
        console.log("ICE gathering complete");
      }
    };

    peerConnection.onicegatheringstatechange = () => {
      console.log("ICE gathering state:", peerConnection.iceGatheringState);
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", peerConnection.iceConnectionState);
    };

    peerConnection.ontrack = (event) => {
      console.log("Remote track received:", event);
      const [stream] = event.streams;
      console.log("Remote stream:", stream);
      setRemoteStream(stream);
      setConnectionState("connected");
      setIsConnected(true);
      setParticipantCount(2);
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log("Peer connection state changed:", state);
      if (state === "connected") {
        setConnectionState("connected");
        setIsConnected(true);
        setConnectionError(null);
      } else if (state === "disconnected" || state === "failed") {
        setConnectionState("disconnected");
        setIsConnected(false);
        setParticipantCount(1);
        setRemoteStream(null);
        if (state === "failed") {
          setConnectionError(
            "Connection failed. Check your network connection."
          );
        }
      } else if (state === "connecting") {
        setConnectionState("connecting");
        setConnectionError(null);
      }
    };

    return peerConnection;
  }, [roomId]);

  // Initialize WebRTC connection
  const initializeConnection = useCallback(async () => {
    console.log("Initializing WebRTC connection for room:", roomId);
    const stream = await initializeLocalStream();
    if (!stream) {
      console.error("Failed to initialize local stream");
      return;
    }

    const peerConnection = createPeerConnection();
    peerConnectionRef.current = peerConnection;

    // Add local stream tracks to peer connection
    stream.getTracks().forEach((track) => {
      console.log("Adding track to peer connection:", track.kind);
      peerConnection.addTrack(track, stream);
    });

    // Setup local BroadcastChannel for signaling
    const broadcastChannel = new BroadcastChannel(`room-${roomId}`);
    broadcastChannelRef.current = broadcastChannel;

    // Handle incoming messages
    broadcastChannel.onmessage = async (event) => {
      const {
        type,
        offer,
        answer,
        candidate,
        roomId: messageRoomId,
        chatMessage,
      } = event.data;

      // Only process messages for this room
      if (messageRoomId !== roomId) return;

      console.log("Received message:", type, event.data);

      try {
        switch (type) {
          case "offer":
            console.log("Received offer:", offer);
            if (!isInitiatorRef.current) {
              await peerConnection.setRemoteDescription(offer);
              remoteDescriptionSetRef.current = true;
              console.log("Remote description set from offer");

              // Process any queued ICE candidates
              await processQueuedIceCandidates();

              const answer = await peerConnection.createAnswer();
              await peerConnection.setLocalDescription(answer);
              console.log("Answer created and local description set");

              broadcastChannel.postMessage({
                type: "answer",
                answer,
                roomId,
              });
              console.log("Answer sent");
            }
            break;

          case "answer":
            console.log("Received answer:", answer);
            if (isInitiatorRef.current) {
              await peerConnection.setRemoteDescription(answer);
              remoteDescriptionSetRef.current = true;
              console.log("Remote description set from answer");

              // Process any queued ICE candidates
              await processQueuedIceCandidates();
            }
            break;

          case "ice-candidate":
            console.log("Received ICE candidate:", candidate);
            if (candidate) {
              if (remoteDescriptionSetRef.current) {
                // Remote description is set, add ICE candidate immediately
                const iceCandidate = new RTCIceCandidate({
                  candidate: candidate.candidate,
                  sdpMid: candidate.sdpMid,
                  sdpMLineIndex: candidate.sdpMLineIndex,
                  usernameFragment: candidate.usernameFragment,
                });
                await peerConnection.addIceCandidate(iceCandidate);
                console.log("ICE candidate added successfully");
              } else {
                // Queue ICE candidate until remote description is set
                console.log(
                  "Queuing ICE candidate until remote description is set"
                );
                queuedIceCandidatesRef.current.push(candidate);
              }
            }
            break;

          case "chat-message":
            if (chatMessage && chatCallbackRef.current) {
              const message: ChatMessage = {
                id: chatMessage.id,
                text: chatMessage.text,
                sender: chatMessage.sender,
                timestamp: new Date(chatMessage.timestamp),
                isOwn: false,
              };
              chatCallbackRef.current(message);
            }
            break;
        }
      } catch (error) {
        console.error(`Error handling ${type}:`, error);
      }
    };

    // Determine if this is the initiator (first to join)
    // Simple heuristic: if no other messages received within 2 seconds, become initiator
    setTimeout(async () => {
      if (!isInitiatorRef.current && !remoteDescriptionSetRef.current) {
        isInitiatorRef.current = true;
        console.log("Becoming initiator, creating offer...");
        try {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          console.log("Offer created and local description set");

          broadcastChannel.postMessage({
            type: "offer",
            offer,
            roomId,
          });
          console.log("Offer sent");
        } catch (error) {
          console.error("Error creating/sending offer:", error);
        }
      }
    }, 2000);
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
  const sendChatMessage = useCallback(
    (message: string) => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({
          type: "chat-message",
          chatMessage: {
            id: Date.now().toString(),
            text: message,
            sender: "Remote User",
            timestamp: new Date().toISOString(),
          },
          roomId,
        });
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

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    // Close broadcast channel
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.close();
    }

    // Reset state
    setLocalStream(null);
    setRemoteStream(null);
    setConnectionState("disconnected");
    setIsConnected(false);
    setParticipantCount(0);
    setConnectionError(null);

    // Reset connection flags
    isInitiatorRef.current = false;
    remoteDescriptionSetRef.current = false;
    queuedIceCandidatesRef.current = [];
  }, []);

  // Retry connection
  const retryConnection = useCallback(() => {
    console.log("Retrying connection...");
    setConnectionError(null);
    setConnectionState("connecting");

    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    // Clean up existing connection
    leaveCall();

    // Retry after a short delay
    retryTimeoutRef.current = setTimeout(() => {
      initializeConnection();
    }, 1000);
  }, [leaveCall, initializeConnection]);

  // Set chat message callback
  const onChatMessage = useCallback(
    (callback: (message: ChatMessage) => void) => {
      chatCallbackRef.current = callback;
    },
    []
  );

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
    onChatMessage,
    retryConnection,
    connectionError,
  };
};
