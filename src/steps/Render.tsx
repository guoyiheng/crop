import React, { useState } from 'react';
import clsx from 'clsx';
import { observer } from 'mobx-react-lite';
import { BsDownload } from 'react-icons/bs';
import { runInAction } from 'mobx';

import styles from './Render.module.scss';
import { mainStore } from '../stores/main';
import { Slider } from '../components/Slider';

export const Render: React.FC = observer(() => {
  const [outputUrl, setOutputUrl] = useState<string>();
  const [logVisible, setLogVisible] = useState(false);

  const { ffmpeg, video } = mainStore;

  if (!ffmpeg.loaded) {
    return (
      <div className={styles.loading}>
        <span>FFmpeg is loading... please wait!</span>
        <progress value={ffmpeg.loadProgress} max={1} />
      </div>
    );
  }

  if (!video) {
    return (
      <div>
        <span>No video selected.</span>
      </div>
    );
  }

  const { area, scale = 1 } = mainStore.transform;
  const x = Math.trunc((scale * (area ? area[0] : 0)) / 2) * 2;
  const y = Math.trunc((scale * (area ? area[1] : 0)) / 2) * 2;
  const width =
    Math.trunc((scale * (area ? area[2] : video.videoWidth)) / 2) * 2;
  const height =
    Math.trunc((scale * (area ? area[3] : video.videoHeight)) / 2) * 2;

  const crop = async () => {
    setOutputUrl(undefined);

    const args: string[] = [];
    const filters: string[] = [];

    const { flipH, flipV, area, time, mute } = mainStore.transform;

    if (flipH) {
      filters.push('hflip');
    }

    if (flipV) {
      filters.push('vflip');
    }

    if (scale !== 1) {
      filters.push(
        `scale=${Math.trunc((video.videoWidth * scale) / 2) * 2}:${
          Math.trunc((video.videoHeight * scale) / 2) * 2
        }`,
      );
    }

    if (
      area &&
      (area[0] !== 0 || area[1] !== 0 || area[2] !== 1 || area[3] !== 1)
    ) {
      filters.push(`crop=${width}:${height}:${x}:${y}`);
    }

    // Add filters
    if (filters.length > 0) {
      args.push('-vf', filters.join(', '));
    }

    if (time) {
      let start = 0;
      if (time[0] > 0) {
        start = time[0];
        args.push('-ss', `${start}`);
      }

      if (time[1] < video.duration) {
        args.push('-t', `${time[1] - start}`);
      }
    }

    args.push('-c:v', 'libx264');
    args.push('-preset', 'veryfast');

    if (mute) {
      args.push('-an');
    } else {
      args.push('-c:a', 'copy');
    }

    const newFile = await ffmpeg.exec(mainStore.file!, args);
    setOutputUrl(URL.createObjectURL(newFile));
  };

  return (
    <div className={styles.step}>
      {ffmpeg.running ? (
        <>
          <div className={styles.actions}>
            <button onClick={() => ffmpeg.cancel()}>
              <span>Cancel</span>
            </button>
          </div>
          <div className={styles.info}>
            <span>Running</span>
            <progress value={ffmpeg.execProgress} max={1} />
            <pre>{ffmpeg.output}</pre>
          </div>
        </>
      ) : (
        <>
          <div className={styles.settings}>
            <div>
              <span>Resolution: </span>
              <div>
                <input
                  type="number"
                  value={width}
                  min={2}
                  step={2}
                  onChange={e => {
                    const newWidth = parseInt(e.target.value, 10);
                    if (!isNaN(newWidth) && newWidth > 0) {
                      const baseWidth = area ? area[2] : video.videoWidth;
                      const newScale = Math.max(0.1, Math.min(1, newWidth / baseWidth));
                      runInAction(() => {
                        mainStore.transform.scale = newScale;
                      });
                    }
                  }}
                />
                <span>x</span>
                <input
                  type="number"
                  value={height}
                  min={2}
                  step={2}
                  onChange={e => {
                    const newHeight = parseInt(e.target.value, 10);
                    if (!isNaN(newHeight) && newHeight > 0) {
                      const baseHeight = area ? area[3] : video.videoHeight;
                      const newScale = Math.max(0.1, Math.min(1, newHeight / baseHeight));
                      runInAction(() => {
                        mainStore.transform.scale = newScale;
                      });
                    }
                  }}
                />
                <span>px</span>
              </div>
            </div>
            <div>
              <span>Scale: </span>
              <input
                type="number"
                value={Math.round(scale * 100) / 100}
                min={0.1}
                max={1}
                step={0.01}
                onChange={e => {
                  const newScale = parseFloat(e.target.value);
                  if (!isNaN(newScale) && newScale >= 0.1 && newScale <= 1) {
                    runInAction(() => {
                      mainStore.transform.scale = newScale;
                    });
                  }
                }}
              />
              <div className={styles.sliderContainer}>
                <Slider
                  min={0.1}
                  max={1}
                  value={scale}
                  onChange={value => {
                    runInAction(() => {
                      mainStore.transform.scale = value;
                    });
                  }}
                />
              </div>
            </div>
          </div>
          <div className={styles.actions}>
            <button onClick={crop}>
              <span>Render MP4</span>
            </button>
            {outputUrl && (
              <a
                href={outputUrl}
                download="cropped.mp4"
                className={clsx('button', styles.download)}
              >
                <BsDownload />
                <span>Download</span>
              </a>
            )}
          </div>
        </>
      )}
      {outputUrl && !ffmpeg.running && (
        <div>
          <video src={outputUrl} controls />
        </div>
      )}
      {!!ffmpeg.log && (
        <div className={styles.info}>
          <button onClick={() => setLogVisible(value => !value)}>
            {logVisible ? 'Hide log' : 'Show log'}
          </button>
          {logVisible && <pre>{ffmpeg.log}</pre>}
        </div>
      )}
    </div>
  );
});
