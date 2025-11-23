import { LyricLine } from '../types';

export const parseSRT = (srtContent: string): LyricLine[] => {
  const lines = srtContent.trim().split(/\r?\n\r?\n/);
  const result: LyricLine[] = [];

  lines.forEach((chunk, index) => {
    const parts = chunk.split(/\r?\n/);
    if (parts.length >= 2) {
      // Handle the case where index might be missing in some malformed SRTs
      let timeString = parts[1];
      let textLines = parts.slice(2);

      // Simple heuristic: if the first line looks like a timestamp, use it
      if (parts[0].includes('-->')) {
        timeString = parts[0];
        textLines = parts.slice(1);
      }

      const timeMatch = timeString.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3}) --> (\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);

      if (timeMatch) {
        const startSeconds =
          parseInt(timeMatch[1]) * 3600 +
          parseInt(timeMatch[2]) * 60 +
          parseInt(timeMatch[3]) +
          parseInt(timeMatch[4]) / 1000;

        const endSeconds =
          parseInt(timeMatch[5]) * 3600 +
          parseInt(timeMatch[6]) * 60 +
          parseInt(timeMatch[7]) +
          parseInt(timeMatch[8]) / 1000;

        result.push({
          id: `line-${index}`,
          startTime: startSeconds,
          endTime: endSeconds,
          text: textLines.join('\n'),
        });
      }
    }
  });

  return result;
};

export const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};
