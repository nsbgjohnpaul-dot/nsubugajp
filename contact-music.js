const playLink = document.querySelector('.contact-music-play');
const musicDialog = document.querySelector('.contact-music-dialog');
const playlistFrame = musicDialog.querySelector('iframe');

playLink.addEventListener('click', event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
    typeof musicDialog.showModal !== 'function') return;
  event.preventDefault();
  musicDialog.showModal();

  if (!playlistFrame.hasAttribute('src')) {
    const playlistUrl = new URL(playLink.href);
    playlistUrl.hostname = 'embed.music.apple.com';
    playlistUrl.searchParams.set('autoplay', '1');
    playlistFrame.src = playlistUrl.href;
  }
});
