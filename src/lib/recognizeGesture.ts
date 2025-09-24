// recognizeGesture.ts
export function recognizeGesture(landmarks: any[], gestures: any[]) {
  if (!landmarks || !Array.isArray(gestures) || gestures.length === 0)
    return null;

  const margin = 0.02; // tolerance for comparisons
  let bestMatch = null;
  let highestScore = -1;

  gestures.forEach((gesture) => {
    let score = 0;
    let total = gesture.landmark_conditions.length;

    for (const condition of gesture.landmark_conditions) {
      if (condition.type === "comparison") {
        const [i, j] = condition.landmarks;
        const axisValue = condition.axis === "y" ? "y" : "x";
        const valI = landmarks[i][axisValue];
        const valJ = landmarks[j][axisValue];

        if (condition.operator === "<" && valI < valJ + margin) score++;
        else if (condition.operator === ">" && valI > valJ - margin) score++;
      } else if (condition.type === "distance") {
        const [i, j] = condition.landmarks;
        const dx = landmarks[i].x - landmarks[j].x;
        const dy = landmarks[i].y - landmarks[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (condition.operator === "<" && dist < condition.threshold) score++;
        else if (condition.operator === ">" && dist > condition.threshold)
          score++;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = gesture;
    }
  });

  // Only return if more than half of the conditions for the best match are satisfied
  if (!bestMatch) return null;
  const required = Math.ceil(bestMatch.landmark_conditions.length / 2);
  return highestScore >= required ? bestMatch.asl : null;
}


