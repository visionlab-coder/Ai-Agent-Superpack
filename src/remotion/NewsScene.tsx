import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from 'remotion';

export interface SceneData {
  readonly id: string;
  readonly type:
    | 'opening'
    | 'headline'
    | 'data'
    | 'analysis'
    | 'expert'
    | 'field'
    | 'closing';
  readonly title: string;
  readonly duration: number;
  readonly narration: string;
  readonly lower_third: string;
  readonly transition:
    | 'fade'
    | 'wipe-left'
    | 'wipe-right'
    | 'zoom-in'
    | 'zoom-out'
    | 'slide-up'
    | 'slide-down'
    | 'flash';
  readonly accent: string;
  readonly bg: string;
  readonly keywords: readonly string[];
  readonly visual_desc?: string;
  readonly unsplash_query?: string;
}

const SCENE_TYPE_LABELS: Record<SceneData['type'], string> = {
  opening: 'OPENING',
  headline: 'HEADLINE',
  data: 'DATA',
  analysis: 'ANALYSIS',
  expert: 'EXPERT',
  field: 'FIELD REPORT',
  closing: 'CLOSING',
};

interface NewsSceneProps {
  readonly scene: SceneData;
  readonly anchor: string;
  readonly backgroundImage?: string;
}

export const NewsScene: React.FC<NewsSceneProps> = ({ scene, anchor, backgroundImage }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const totalFrames = scene.duration * fps;
  const progress = frame / totalFrames;

  // --- Animations ---
  const fadeIn = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const fadeOut = interpolate(
    frame,
    [totalFrames - 15, totalFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const opacity = Math.min(fadeIn, fadeOut);

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 80, stiffness: 200 },
  });

  const badgeSlide = spring({
    frame: frame - 5,
    fps,
    config: { damping: 60, stiffness: 180 },
  });

  const lowerThirdSlide = spring({
    frame: frame - 10,
    fps,
    config: { damping: 70, stiffness: 160 },
  });

  const tickerOffset = interpolate(frame, [0, totalFrames], [100, -100], {
    extrapolateRight: 'clamp',
  });

  // Ken Burns zoom
  const zoom = 1 + progress * 0.03;

  // Grid noise pattern
  const gridSize = 32;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: scene.bg || '#080B10',
        opacity,
        overflow: 'hidden',
      }}
    >
      {/* Background image with Ken Burns zoom */}
      {backgroundImage && (
        <AbsoluteFill
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
          }}
        >
          <img
            src={backgroundImage}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'brightness(0.35) saturate(0.8)',
            }}
          />
        </AbsoluteFill>
      )}

      {/* Ken Burns zoom container */}
      <AbsoluteFill
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Grid noise overlay */}
        <AbsoluteFill
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
            `,
            backgroundSize: `${gridSize}px ${gridSize}px`,
          }}
        />
      </AbsoluteFill>

      {/* Top news bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 48,
          background: `linear-gradient(90deg, ${scene.accent}22, ${scene.accent}44, ${scene.accent}22)`,
          borderBottom: `2px solid ${scene.accent}`,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 24,
          paddingRight: 24,
          opacity: fadeIn,
        }}
      >
        <div
          style={{
            color: '#F0F4FF',
            fontSize: 18,
            fontWeight: 'bold',
            letterSpacing: 2,
          }}
        >
          VIDEO HARNESS NEWS
        </div>
        <div
          style={{
            marginLeft: 'auto',
            color: '#CDD5E0',
            fontSize: 14,
          }}
        >
          LIVE
        </div>
      </div>

      {/* Scene type badge */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 60,
          transform: `translateX(${interpolate(badgeSlide, [0, 1], [-200, 0])}px)`,
          opacity: badgeSlide,
        }}
      >
        <div
          style={{
            background: scene.accent,
            color: '#080B10',
            fontSize: 16,
            fontWeight: 'bold',
            padding: '6px 18px',
            borderRadius: 4,
            letterSpacing: 1.5,
          }}
        >
          {SCENE_TYPE_LABELS[scene.type]}
        </div>
      </div>

      {/* Main title */}
      <div
        style={{
          position: 'absolute',
          top: 200,
          left: 60,
          right: 60,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [40, 0])}px)`,
          opacity: titleSpring,
        }}
      >
        <h1
          style={{
            color: '#F0F4FF',
            fontSize: 56,
            fontWeight: 'bold',
            lineHeight: 1.2,
            margin: 0,
            textShadow: '0 2px 12px rgba(0,0,0,0.6)',
          }}
        >
          {scene.title}
        </h1>
      </div>

      {/* Keyword badges */}
      <div
        style={{
          position: 'absolute',
          top: 340,
          left: 60,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        {scene.keywords.map((keyword, i) => {
          const keywordSpring = spring({
            frame: frame - 15 - i * 3,
            fps,
            config: { damping: 60, stiffness: 200 },
          });
          return (
            <div
              key={keyword}
              style={{
                background: `${scene.accent}33`,
                border: `1px solid ${scene.accent}66`,
                color: scene.accent,
                fontSize: 14,
                fontWeight: 600,
                padding: '4px 14px',
                borderRadius: 20,
                opacity: keywordSpring,
                transform: `scale(${keywordSpring})`,
              }}
            >
              #{keyword}
            </div>
          );
        })}
      </div>

      {/* Narration text area (center) */}
      <div
        style={{
          position: 'absolute',
          top: 440,
          left: 60,
          right: 60,
          opacity: interpolate(frame, [20, 35], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        <p
          style={{
            color: '#CDD5E0',
            fontSize: 24,
            lineHeight: 1.6,
            margin: 0,
            maxWidth: 1200,
          }}
        >
          {scene.narration}
        </p>
      </div>

      {/* Lower third */}
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          left: 0,
          transform: `translateX(${interpolate(lowerThirdSlide, [0, 1], [-600, 0])}px)`,
          opacity: lowerThirdSlide,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            background: 'rgba(0,0,0,0.9)',
            borderRadius: '0 6px 6px 0',
            overflow: 'hidden',
          }}
        >
          {/* Accent sidebar */}
          <div
            style={{
              width: 4,
              background: scene.accent,
              flexShrink: 0,
            }}
          />
          <div style={{ padding: '12px 24px' }}>
            <div
              style={{
                color: scene.accent,
                fontSize: 28,
                fontWeight: 'bold',
                marginBottom: 4,
              }}
            >
              {anchor}
            </div>
            <div
              style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: 20,
                maxWidth: 600,
              }}
            >
              {scene.lower_third}
            </div>
          </div>
        </div>
      </div>

      {/* Breaking news ticker */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 40,
          background: '#B91C1C',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {/* BREAKING label */}
        <div
          style={{
            background: '#E8C547',
            color: '#080B10',
            fontSize: 14,
            fontWeight: 'bold',
            padding: '0 16px',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            zIndex: 1,
            letterSpacing: 1,
          }}
        >
          BREAKING
        </div>
        {/* Scrolling text */}
        <div
          style={{
            whiteSpace: 'nowrap',
            color: '#FFFFFF',
            fontSize: 15,
            transform: `translateX(${tickerOffset}%)`,
            paddingLeft: 24,
          }}
        >
          {scene.title} &mdash; {scene.narration}
        </div>
      </div>
    </AbsoluteFill>
  );
};
