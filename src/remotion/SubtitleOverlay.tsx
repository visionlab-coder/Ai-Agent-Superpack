import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface SubtitleCue {
  readonly index: number;
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
}

interface SubtitleOverlayProps {
  readonly srtContent: string;
  readonly sceneStartSec: number;
  readonly sceneDurationSec: number;
}

function parseSrt(srt: string): SubtitleCue[] {
  const blocks = srt.trim().split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;

    const index = parseInt(lines[0], 10);
    const timeMatch = lines[1].match(
      /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/,
    );
    if (!timeMatch) continue;

    const startMs =
      parseInt(timeMatch[1]) * 3600000 +
      parseInt(timeMatch[2]) * 60000 +
      parseInt(timeMatch[3]) * 1000 +
      parseInt(timeMatch[4]);
    const endMs =
      parseInt(timeMatch[5]) * 3600000 +
      parseInt(timeMatch[6]) * 60000 +
      parseInt(timeMatch[7]) * 1000 +
      parseInt(timeMatch[8]);

    const text = lines.slice(2).join('\n');
    cues.push({ index, startMs, endMs, text });
  }

  return cues;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  srtContent,
  sceneStartSec,
  sceneDurationSec,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentTimeSec = sceneStartSec + frame / fps;
  const currentTimeMs = currentTimeSec * 1000;

  const cues = React.useMemo(() => parseSrt(srtContent), [srtContent]);

  const activeCue = cues.find(
    (cue) => currentTimeMs >= cue.startMs && currentTimeMs < cue.endMs,
  );

  if (!activeCue) return null;

  const cueProgress = (currentTimeMs - activeCue.startMs) / (activeCue.endMs - activeCue.startMs);
  const fadeIn = interpolate(cueProgress, [0, 0.05], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(cueProgress, [0.9, 1], [1, 0], { extrapolateLeft: 'clamp' });
  const opacity = Math.min(fadeIn, fadeOut);

  const subtitleLines = activeCue.text.split('\n');

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 160,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        opacity,
      }}
    >
      <div
        style={{
          background: 'rgba(0, 0, 0, 0.75)',
          borderRadius: 8,
          padding: '10px 28px',
          maxWidth: 1200,
        }}
      >
        {subtitleLines.map((line, i) => (
          <div
            key={i}
            style={{
              color: '#FFFFFF',
              fontSize: 32,
              fontWeight: 600,
              textAlign: 'center',
              lineHeight: 1.5,
              textShadow: '0 2px 6px rgba(0,0,0,0.8)',
            }}
          >
            {line}
          </div>
        ))}
      </div>
    </div>
  );
};

export { parseSrt };
export type { SubtitleCue };
