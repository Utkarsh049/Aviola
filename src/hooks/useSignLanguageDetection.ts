import { useState, useEffect, useRef, useCallback } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { recognizeGesture } from "../lib/recognizeGesture";
import { generateSentenceFromWords } from "../lib/gemini";
import gesturePatterns from "../lib/gestures_pattern.json";

interface UseSignLanguageDetectionReturn {
  detectedWords: string[];
  currentGesture: string;
  isDetecting: boolean;
  error: string | null;
  startDetection: () => void;
  stopDetection: () => void;
  clearWords: () => void;
  generateSentence: () => Promise<string | null>;
  isGenerating: boolean;
}

export const useSignLanguageDetection = (
  videoElement: HTMLVideoElement | null
): UseSignLanguageDetectionReturn => {
  const [detectedWords, setDetectedWords] = useState<string[]>([]);
  const [currentGesture, setCurrentGesture] = useState<string>("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const lastGestureRef = useRef<string>("");
  const gestureCountRef = useRef<number>(0);
  const lastGestureTimeRef = useRef<number>(0);

  const startDetection = useCallback(() => {
    if (!videoElement || isDetecting) return;

    try {
      setError(null);
      setIsDetecting(true);

      const hands = new Hands({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      hands.onResults((results) => {
        if (
          results.multiHandLandmarks &&
          results.multiHandLandmarks.length > 0
        ) {
          const gestureName = recognizeGesture(
            results.multiHandLandmarks[0],
            gesturePatterns.gestures
          );

          if (gestureName) {
            setCurrentGesture(gestureName);

            // Add gesture to words if it's held for a certain duration
            const now = Date.now();
            if (gestureName === lastGestureRef.current) {
              gestureCountRef.current++;

              // If gesture is held for 1 second (30 frames at 30fps), add it to words
              if (
                gestureCountRef.current >= 30 &&
                now - lastGestureTimeRef.current > 1000
              ) {
                setDetectedWords((prev) => {
                  // Avoid adding duplicate consecutive words
                  if (
                    prev.length === 0 ||
                    prev[prev.length - 1] !== gestureName
                  ) {
                    return [...prev, gestureName];
                  }
                  return prev;
                });
                gestureCountRef.current = 0;
                lastGestureTimeRef.current = now;
              }
            } else {
              lastGestureRef.current = gestureName;
              gestureCountRef.current = 1;
              lastGestureTimeRef.current = now;
            }
          } else {
            setCurrentGesture("");
            lastGestureRef.current = "";
            gestureCountRef.current = 0;
          }
        } else {
          setCurrentGesture("");
          lastGestureRef.current = "";
          gestureCountRef.current = 0;
        }
      });

      handsRef.current = hands;

      const camera = new Camera(videoElement, {
        onFrame: async () => {
          if (handsRef.current) {
            await handsRef.current.send({ image: videoElement });
          }
        },
        width: 640,
        height: 480,
      });

      cameraRef.current = camera;
      camera.start();
    } catch (err: any) {
      setError(`Failed to start sign language detection: ${err.message}`);
      setIsDetecting(false);
    }
  }, [videoElement, isDetecting]);

  const stopDetection = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }

    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }

    setIsDetecting(false);
    setCurrentGesture("");
    lastGestureRef.current = "";
    gestureCountRef.current = 0;
  }, []);

  const clearWords = useCallback(() => {
    setDetectedWords([]);
  }, []);

  const generateSentence = useCallback(async (): Promise<string | null> => {
    if (detectedWords.length === 0) return null;

    setIsGenerating(true);
    try {
      const sentence = await generateSentenceFromWords(detectedWords);
      return sentence;
    } catch (err: any) {
      setError(`Failed to generate sentence: ${err.message}`);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [detectedWords]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    detectedWords,
    currentGesture,
    isDetecting,
    error,
    startDetection,
    stopDetection,
    clearWords,
    generateSentence,
    isGenerating,
  };
};


