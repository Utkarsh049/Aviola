import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { Video, Users, Plus, ArrowRight } from 'lucide-react';

const RoomCreation = () => {
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();

  const createRoom = async () => {
    setIsCreating(true);
    const newRoomId = uuidv4();
    
    // Simulate room creation delay
    setTimeout(() => {
      navigate(`/room/${newRoomId}`);
      setIsCreating(false);
    }, 1000);
  };

  const joinRoom = async () => {
    if (!roomId.trim()) {
      alert('Please enter a valid room ID');
      return;
    }
    
    setIsJoining(true);
    
    // Simulate room joining delay
    setTimeout(() => {
      navigate(`/room/${roomId.trim()}`);
      setIsJoining(false);
    }, 800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl mb-4">
            <Video className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">VideoConnect</h1>
          <p className="text-white/70 text-lg">Connect with anyone, anywhere</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-xl border border-white/20">
          {/* Create Room Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
              <Plus className="w-5 h-5" />
              Create New Room
            </h2>
            <button
              onClick={createRoom}
              disabled={isCreating}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-4 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
            >
              {isCreating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating Room...
                </>
              ) : (
                <>
                  <Video className="w-5 h-5" />
                  Create Room
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-transparent text-white/60 font-medium">OR</span>
            </div>
          </div>

          {/* Join Room Section */}
          <div>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-3">
              <Users className="w-5 h-5" />
              Join Existing Room
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-4 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
              />
              <button
                onClick={joinRoom}
                disabled={isJoining || !roomId.trim()}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-600 disabled:to-gray-700 text-white py-4 px-6 rounded-xl font-semibold transition-all duration-300 transform hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                {isJoining ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Joining Room...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-5 h-5" />
                    Join Room
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white/50 text-sm">
            Share the Room ID with others to start your video call
          </p>
        </div>
      </div>
    </div>
  );
};

export default RoomCreation;