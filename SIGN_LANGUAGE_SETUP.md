# Sign Language Integration Setup

This document explains how to set up the sign language detection feature in the video call app.

## Required Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Gemini AI API Key for sign language sentence generation
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Gemini model name (defaults to gemini-2.5-flash-lite)
VITE_GEMINI_MODEL=gemini-2.5-flash-lite
```

## Getting a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key
5. Add it to your `.env` file

## Installation

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

## How to Use Sign Language Detection

1. **Start a Video Call**: Create or join a room
2. **Enable Sign Language Detection**: Click the hand icon (🖐️) in the bottom controls
3. **Perform Gestures**: Make sign language gestures in front of your camera
4. **View Detected Words**: The detected words will appear in the chat panel
5. **Generate Sentences**: Click "Generate & Send" to create a proper sentence from the detected words
6. **Send to Chat**: The AI-generated sentence will be sent to the chat

## Supported Gestures

The system recognizes over 50 sign language gestures including:

- **Basic Words**: yes, no, please, thank you, sorry, good, bad
- **Emotions**: happy, sad, angry, love
- **Actions**: work, eat, drink, sleep, go, come
- **Questions**: what, where, when, why, how, who
- **People**: me, you, he, she, we, they
- **Places**: home, school, work, hospital
- **Time**: today, tomorrow, yesterday, now, later
- **Medical**: pain, doctor, medicine, emergency

## Troubleshooting

### Camera Not Working

- Ensure camera permissions are granted
- Check if another application is using the camera
- Try refreshing the page

### Sign Language Not Detecting

- Ensure good lighting
- Keep your hand clearly visible in the camera frame
- Hold gestures for at least 1 second
- Check the browser console for errors

### AI Sentence Generation Failing

- Verify your Gemini API key is correct
- Check your internet connection
- Ensure the API key has proper permissions

## Technical Details

- **Hand Detection**: Uses MediaPipe Hands for real-time hand landmark detection
- **Gesture Recognition**: Custom algorithm that matches hand landmarks to predefined gestures
- **AI Integration**: Google Gemini API for natural language sentence generation
- **Real-time Processing**: Gestures are processed at 30fps for smooth detection

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

Note: WebRTC and camera access require HTTPS in production environments.


