import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RoomCreation from './components/RoomCreation';
import VideoCall from './components/VideoCall';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900">
        <Routes>
          <Route path="/" element={<RoomCreation />} />
          <Route path="/room/:roomId" element={<VideoCall />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;