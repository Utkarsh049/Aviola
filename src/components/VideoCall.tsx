import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Copy,
  Users,
  Wifi,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import { useWebRTC } from "../hooks/useWebRTC";
import { ChatMessage } from "../types/chat";

interface VideoCallProps {}

const VideoCall: React.FC<VideoCallProps> = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const {
    localStream,
    remoteStreams,
    connectionState,
    isConnected,
    participantCount,
    toggleVideo,
    toggleAudio,
    leaveCall,
    sendChatMessage,
    retryConnection,
    connectionError,
  } = useWebRTC(roomId!);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStreams.length > 0) {
      // Show the first remote stream in the main video area
      remoteVideoRef.current.srcObject = remoteStreams[0];
    }
  }, [remoteStreams]);

  useEffect(() => {
    // Listen for incoming chat messages
    const handleChatMessage = (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timer);
  }, [showControls]);

  const handleVideoToggle = () => {
    toggleVideo();
    setIsVideoEnabled(!isVideoEnabled);
  };

  const handleAudioToggle = () => {
    toggleAudio();
    setIsAudioEnabled(!isAudioEnabled);
  };

  const handleLeaveCall = () => {
    leaveCall();
    navigate("/");
  };

  const copyRoomId = async () => {
    if (roomId) {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && sendChatMessage) {
      const message: ChatMessage = {
        id: Date.now().toString(),
        text: newMessage.trim(),
        sender: "You",
        timestamp: new Date(),
        isOwn: true,
      };
      setMessages((prev) => [...prev, message]);
      sendChatMessage(newMessage.trim());
      setNewMessage("");
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case "connected":
        return "text-green-400";
      case "connecting":
        return "text-yellow-400";
      case "disconnected":
        return "text-red-400";
      default:
        return "text-gray-400";
    }
  };

  return (
    <div
      className="relative min-h-screen bg-gray-900 overflow-hidden cursor-none"
      onMouseMove={() => setShowControls(true)}
    >
      {/* Remote Video (Main) */}
      <div
        className={`absolute inset-0 transition-all duration-300 ${
          isChatOpen ? "right-80" : "right-0"
        }`}
      >
        {remoteStreams.length > 0 ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Users className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-white text-xl mb-2">
                Waiting for participants...
              </p>
              <p className="text-gray-400">
                Share the room ID to invite others
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Additional Remote Videos (Picture in Picture) */}
      {remoteStreams.length > 1 && (
        <div className={`absolute top-60 w-64 space-y-2 transition-all duration-300 ${
          isChatOpen ? "right-84" : "right-4"
        }`}>
          {remoteStreams.slice(1).map((stream, index) => (
            <div
              key={stream.id}
              className="w-full h-36 bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20"
            >
              <video
                autoPlay
                playsInline
                ref={(el) => {
                  if (el) el.srcObject = stream;
                }}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Local Video (Picture in Picture) */}
      <div
        className={`absolute top-4 w-64 h-48 bg-gray-800 rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 transition-all duration-300 ${
          isChatOpen ? "right-84" : "right-4"
        }`}
      >
        {localStream ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <Video className="w-8 h-8 text-gray-400" />
          </div>
        )}
        {!isVideoEnabled && (
          <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
            <VideoOff className="w-8 h-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <div
        className={`absolute top-0 right-0 h-full w-80 bg-gray-900/95 backdrop-blur-md border-l border-white/10 transform transition-transform duration-300 ${
          isChatOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Chat
            </h3>
            <button
              onClick={() => setIsChatOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 mt-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.isOwn ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xs px-3 py-2 rounded-lg ${
                      message.isOwn
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-white"
                    }`}
                  >
                    {!message.isOwn && (
                      <p className="text-xs text-gray-300 mb-1">
                        {message.sender}
                      </p>
                    )}
                    <p className="text-sm">{message.text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Overlay for Mobile */}
      {isChatOpen && (
        <div
          className="absolute inset-0 bg-black/50 lg:hidden"
          onClick={() => setIsChatOpen(false)}
        />
      )}

      {/* Top Bar */}
      <div
        className={`absolute top-0 left-0 bg-gradient-to-b from-black/50 to-transparent p-4 transition-all duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        } ${isChatOpen ? "right-80" : "right-0"}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Wifi className={`w-5 h-5 ${getConnectionStatusColor()}`} />
              <span className="text-white font-medium capitalize">
                {connectionState}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-white" />
              <span className="text-white">
                {participantCount} participant
                {participantCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <button
            onClick={copyRoomId}
            className="flex items-center gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-all duration-300"
          >
            <Copy className="w-4 h-4" />
            <span className="font-mono text-sm">{roomId?.slice(0, 8)}...</span>
            {copied && <span className="text-green-400 text-sm ml-1">✓</span>}
          </button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div
        className={`absolute bottom-0 left-0 bg-gradient-to-t from-black/50 to-transparent p-6 transition-all duration-300 ${
          showControls ? "opacity-100" : "opacity-0"
        } ${isChatOpen ? "right-80" : "right-0"}`}
      >
        <div className="flex items-center justify-center gap-4">
          {/* Audio Toggle */}
          <button
            onClick={handleAudioToggle}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
              isAudioEnabled
                ? "bg-gray-700/80 hover:bg-gray-600/80"
                : "bg-red-600/80 hover:bg-red-500/80"
            }`}
          >
            {isAudioEnabled ? (
              <Mic className="w-6 h-6 text-white" />
            ) : (
              <MicOff className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Video Toggle */}
          <button
            onClick={handleVideoToggle}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
              isVideoEnabled
                ? "bg-gray-700/80 hover:bg-gray-600/80"
                : "bg-red-600/80 hover:bg-red-500/80"
            }`}
          >
            {isVideoEnabled ? (
              <Video className="w-6 h-6 text-white" />
            ) : (
              <VideoOff className="w-6 h-6 text-white" />
            )}
          </button>

          {/* Chat Toggle */}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
              isChatOpen
                ? "bg-blue-600/80 hover:bg-blue-500/80"
                : "bg-gray-700/80 hover:bg-gray-600/80"
            }`}
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </button>

          {/* Debug Toggle */}
          <button
            onClick={() => setShowDebugInfo(!showDebugInfo)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
              showDebugInfo
                ? "bg-yellow-600/80 hover:bg-yellow-500/80"
                : "bg-gray-700/80 hover:bg-gray-600/80"
            }`}
            title="Debug Info"
          >
            <span className="text-white font-mono text-xs">DBG</span>
          </button>

          {/* Leave Call */}
          <button
            onClick={handleLeaveCall}
            className="w-14 h-14 rounded-full bg-red-600/80 hover:bg-red-500/80 flex items-center justify-center transition-all duration-300"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Connection Status Overlay */}
      {connectionState === "connecting" && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center max-w-md mx-4">
            <div className="w-12 h-12 border-3 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-xl mb-4">Connecting to room...</p>
            <p className="text-gray-300 text-sm">Room ID: {roomId}</p>
            <p className="text-gray-400 text-xs mt-2">
              Make sure both devices are on the same network
            </p>
          </div>
        </div>
      )}

      {/* Connection Error Overlay */}
      {connectionError && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-red-900/20 backdrop-blur-md rounded-2xl p-8 text-center max-w-md mx-4 border border-red-500/30">
            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Wifi className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-white text-xl mb-2">Connection Failed</p>
            <p className="text-red-300 text-sm mb-4">{connectionError}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={retryConnection}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Retry Connection
              </button>
              <button
                onClick={handleLeaveCall}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Leave Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info Panel */}
      {showDebugInfo && (
        <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md rounded-lg p-4 text-white text-xs font-mono max-w-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Debug Info</h3>
            <button
              onClick={() => setShowDebugInfo(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-1">
            <div>Room ID: {roomId}</div>
            <div>Connection: {connectionState}</div>
            <div>Participants: {participantCount}</div>
            <div>Local Stream: {localStream ? "✓" : "✗"}</div>
            <div>Remote Streams: {remoteStreams.length}</div>
            <div>Video Enabled: {isVideoEnabled ? "✓" : "✗"}</div>
            <div>Audio Enabled: {isAudioEnabled ? "✓" : "✗"}</div>
            {connectionError && (
              <div className="text-red-400 mt-2">Error: {connectionError}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoCall;
