import React from 'react';
import { Composition, Series, Audio, staticFile } from 'remotion';
import { NewsScene, SceneData } from './NewsScene';
import { SubtitleOverlay } from './SubtitleOverlay';

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

interface InputProps {
  readonly scenes: readonly SceneData[];
  readonly topic: string;
  readonly anchor: string;
  readonly episodePrefix: string;
  readonly srtContent: string;
}

const NewsVideo: React.FC<InputProps> = ({ scenes, anchor, episodePrefix, srtContent }) => {
  let cumulativeSec = 0;

  return (
    <Series>
      {scenes.map((scene) => {
        const sceneId = scene.id.split('-')[1];
        const filePrefix = episodePrefix.replace('-', '_');
        const audioSrc = staticFile(`audio/${filePrefix}_${sceneId}.mp3`);
        const imageSrc = staticFile(`images/${filePrefix}_${sceneId}.jpg`);
        const durationFrames = scene.duration * FPS;
        const sceneStartSec = cumulativeSec;
        cumulativeSec += scene.duration;

        return (
          <Series.Sequence
            key={scene.id}
            durationInFrames={durationFrames}
          >
            <NewsScene
              scene={scene}
              anchor={anchor}
              backgroundImage={imageSrc}
            />
            {srtContent && (
              <SubtitleOverlay
                srtContent={srtContent}
                sceneStartSec={sceneStartSec}
                sceneDurationSec={scene.duration}
              />
            )}
            <Audio src={audioSrc} volume={1} />
          </Series.Sequence>
        );
      })}
    </Series>
  );
};

const EPISODES = [
  { prefix: 'rc-ep01', title: '철근콘크리트 — 건설의 기본을 말하다' },
  { prefix: 'rc-ep02', title: '콘크리트의 과학 — 재료와 수화반응' },
  { prefix: 'rc-ep03', title: '철근의 종류와 역할' },
  { prefix: 'rc-ep04', title: '배합설계와 강도' },
  { prefix: 'rc-ep05', title: '거푸집 공사' },
  { prefix: 'rc-ep06', title: '철근 배근 공사' },
  { prefix: 'rc-ep07', title: '콘크리트 타설' },
  { prefix: 'rc-ep08', title: '양생과 품질관리' },
  { prefix: 'rc-ep09', title: '균열과 보수보강' },
  { prefix: 'rc-ep10', title: 'RC의 미래 — 첨단 기술과 건설 혁신' },
];

const defaultScenes: SceneData[] = [
  {
    id: 'EP01-SC01',
    type: 'opening',
    title: '철근콘크리트 — 건설의 기본을 말하다',
    duration: 35,
    narration: '철근콘크리트는 현대 건축의 뼈대이자 가장 신뢰받는 구조 시스템입니다.',
    lower_third: '철근콘크리트 시리즈 EP01',
    transition: 'fade',
    accent: '#60A5FA',
    bg: '#0D1F35',
    keywords: ['철근콘크리트', '시리즈소개', '건설기본'],
  },
];

export const Root: React.FC = () => {
  return (
    <>
      {EPISODES.map(({ prefix, title }) => (
        <Composition
          key={prefix}
          id={prefix}
          component={NewsVideo}
          durationInFrames={300 * FPS}
          fps={FPS}
          width={WIDTH}
          height={HEIGHT}
          defaultProps={{
            scenes: defaultScenes,
            topic: title,
            anchor: '김무빈 앵커',
            episodePrefix: prefix,
            srtContent: '',
          }}
          calculateMetadata={({ props }) => {
            const totalFrames = props.scenes.reduce(
              (sum: number, s: SceneData) => sum + s.duration * FPS,
              0,
            );
            return {
              durationInFrames: totalFrames,
              props,
            };
          }}
        />
      ))}
    </>
  );
};
