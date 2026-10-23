export function mediaPlayback() {
  let element: HTMLMediaElement | null = null;
  let paused = $state(true), duration = $state(0), position = $state(0), volume = $state(1);
  let muted = $state(false), error = $state(false), captions = $state(false);
  function attach(media: HTMLMediaElement) {
    element = media;
    paused = true; duration = 0; position = 0; error = false; captions = false;
    media.volume = volume; media.muted = muted;
    const controller = new AbortController();
    const update = () => {
      if (element !== media) return;
      paused = media.paused;
      duration = Number.isFinite(media.duration) ? media.duration : 0;
      position = media.currentTime;
      volume = media.volume; muted = media.muted;
      error = media.error !== null;
    };
    for (const event of ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'pause', 'ended', 'volumechange', 'error']) {
      media.addEventListener(event, update, { signal: controller.signal });
    }
    return { destroy() {
      controller.abort(); media.pause(); media.removeAttribute('src'); media.load();
      if (element === media) { element = null; paused = true; }
    } };
  }
  async function toggle() {
    const media = element;
    if (!media) return;
    if (!media.paused) { media.pause(); return; }
    try { await media.play(); } catch { if (element === media) error = true; }
  }
  function seek(value: number) {
    if (element && duration > 0) element.currentTime = Math.max(0, Math.min(duration, value));
  }
  function setVolume(value: number) { if (element) { element.volume = Math.max(0, Math.min(1, value)); element.muted = value === 0; } }
  function mute() { if (element) element.muted = !element.muted; }
  function toggleCaptions() {
    captions = !captions;
    if (element) for (let i = 0; i < element.textTracks.length; i++) {
      element.textTracks[i]!.mode = captions && i === 0 ? 'showing' : 'disabled';
    }
  }
  function retry() { if (element) { error = false; element.load(); } }
  function stop() { element?.pause(); }
  return { attach, toggle, seek, setVolume, mute, retry, stop, toggleCaptions,
    get paused() { return paused; }, get duration() { return duration; }, get position() { return position; },
    get volume() { return volume; }, get muted() { return muted; }, get error() { return error; },
    get captions() { return captions; },
  };
}
export type MediaPlayback = ReturnType<typeof mediaPlayback>;
export function mediaTime(seconds: number) {
  const value = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}
