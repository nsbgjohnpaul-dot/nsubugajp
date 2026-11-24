const turntable = document.querySelector('.contact-music');
const developerToken = turntable?.dataset.developerToken;
const musicPanel = document.querySelector('.contact-music-player');
const musicFrame = musicPanel.querySelector('iframe');

musicPanel.addEventListener('toggle', ({ newState }) => {
  if (newState === 'open') {
    musicFrame.src = musicFrame.dataset.src;
  } else {
    musicFrame.removeAttribute('src');
  }
});

if (developerToken) {
  document.addEventListener('musickitloaded', async () => {
    const { MusicKit } = window;
    try {
      await MusicKit.configure({ developerToken, app: { name: 'Nsubuga John Paul' } });
    } catch {
      return;
    }

    const player = MusicKit.getInstance();
    let playlistQueued = false;
    let pending = false;

    turntable.setAttribute('aria-label', 'Play Studio Vybz');
    player.addEventListener(MusicKit.Events.playbackStateDidChange, ({ state }) => {
      const playing = state === MusicKit.PlaybackStates.playing;
      turntable.toggleAttribute('data-playing', playing);
      turntable.setAttribute('aria-label', playing ? 'Pause Studio Vybz' : 'Play Studio Vybz');
    });

    turntable.addEventListener('click', async (event) => {
      if (musicPanel.matches(':popover-open')) return;
      event.preventDefault();
      if (pending) return;
      pending = true;

      try {
        if (turntable.hasAttribute('data-playing')) {
          await player.pause();
          return;
        }
        if (!playlistQueued) {
          await player.authorize();
          const playlistUrl = new URL(musicFrame.dataset.src);
          await player.setQueue({ playlist: playlistUrl.pathname.split('/').at(-1) });
          playlistQueued = true;
        }
        await player.play();
      } catch {
        musicPanel.showPopover();
      } finally {
        pending = false;
      }
    });
  }, { once: true });

  const sdk = document.createElement('script');
  sdk.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
  document.head.append(sdk);
}
