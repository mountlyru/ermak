(() => {
  const media = window.ERMAK_MEDIA;
  const dialog = document.getElementById('photo-viewer');
  if (!media || !dialog) return;
  const groups = new Map(Object.entries(media.galleries));
  const rooms = new Map(media.rooms.map(room => [room.id, room]));
  const image = dialog.querySelector('.viewer-image');
  const stage = dialog.querySelector('.viewer-stage');
  const title = dialog.querySelector('#photo-viewer-title');
  const description = dialog.querySelector('.viewer-description');
  const caption = dialog.querySelector('.viewer-caption');
  const counter = dialog.querySelector('.viewer-counter');
  const thumbnails = dialog.querySelector('.viewer-thumbnails');
  const zoom = dialog.querySelector('.viewer-zoom');
  const original = dialog.querySelector('.viewer-original');
  const previous = dialog.querySelector('.viewer-prev');
  const next = dialog.querySelector('.viewer-next');
  let activeGroup = null;
  let activeIndex = 0;
  let returnFocus = null;
  let thumbnailGroup = null;

  const resetZoom = () => {
    dialog.classList.remove('is-zoomed');
    zoom.setAttribute('aria-pressed', 'false');
    zoom.textContent = 'Увеличить';
    stage.scrollTop = 0;
    stage.scrollLeft = 0;
  };
  const render = () => {
    const group = groups.get(activeGroup);
    if (!group?.photos.length) return;
    resetZoom();
    const photo = group.photos[activeIndex];
    title.textContent = group.title;
    description.textContent = group.description || '';
    caption.textContent = photo.caption || '';
    counter.textContent = (activeIndex + 1) + ' / ' + group.photos.length;
    image.alt = photo.caption || group.title;
    image.src = photo.src;
    original.href = photo.src;
    previous.hidden = next.hidden = group.photos.length < 2;
    if (thumbnailGroup !== activeGroup) {
      thumbnails.replaceChildren();
      group.photos.forEach((item, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', 'Фото ' + (index + 1));
        const preview = document.createElement('img');
        preview.src = item.thumb || item.src;
        preview.alt = '';
        preview.loading = 'lazy';
        button.append(preview);
        button.addEventListener('click', () => {
          activeIndex = index;
          render();
        });
        thumbnails.append(button);
      });
      thumbnailGroup = activeGroup;
    }
    [...thumbnails.children].forEach((button, index) => {
      button.setAttribute('aria-current', String(index === activeIndex));
    });
    const current = thumbnails.children[activeIndex];
    if (current) {
      const left = current.offsetLeft - thumbnails.offsetLeft;
      if (left < thumbnails.scrollLeft || left + current.offsetWidth > thumbnails.scrollLeft + thumbnails.clientWidth) {
        thumbnails.scrollLeft = Math.max(0, left - thumbnails.clientWidth / 2 + current.offsetWidth / 2);
      }
    }
  };
  const open = (key, index = 0, trigger = null) => {
    const group = groups.get(key);
    if (!group?.photos.length) return;
    if (typeof dialog.showModal !== 'function') {
      window.open(group.photos[index]?.src || group.photos[0].src, '_blank', 'noopener');
      return;
    }
    activeGroup = key;
    activeIndex = Math.max(0, Math.min(Number(index) || 0, group.photos.length - 1));
    returnFocus = trigger || document.activeElement;
    render();
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('photo-viewer-open');
  };
  const step = direction => {
    const photos = groups.get(activeGroup)?.photos;
    if (!photos?.length) return;
    activeIndex = (activeIndex + direction + photos.length) % photos.length;
    render();
  };
  previous.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  dialog.querySelector('.viewer-close').addEventListener('click', () => dialog.close());
  zoom.addEventListener('click', () => {
    const enlarged = dialog.classList.toggle('is-zoomed');
    zoom.setAttribute('aria-pressed', String(enlarged));
    zoom.textContent = enlarged ? 'Уместить' : 'Увеличить';
    stage.scrollTop = 0;
    stage.scrollLeft = 0;
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('photo-viewer-open');
    resetZoom();
    returnFocus?.focus?.({ preventScroll: true });
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      dialog.close();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    }
  });
  image.addEventListener('error', () => {
    caption.textContent = 'Фото не загрузилось. Его можно открыть по ссылке «Открыть файл».';
  });
  let touch = null;
  stage.addEventListener('touchstart', event => {
    if (event.touches.length === 1 && !dialog.classList.contains('is-zoomed')) {
      touch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    } else touch = null;
  }, { passive: true });
  stage.addEventListener('touchend', event => {
    if (!touch || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - touch.x;
    const dy = event.changedTouches[0].clientY - touch.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3) step(dx < 0 ? 1 : -1);
    touch = null;
  }, { passive: true });

  document.addEventListener('click', event => {
    const slide = event.target.closest('[data-room-step]');
    if (slide) {
      const card = slide.closest('[data-room-id]');
      const room = rooms.get(card?.dataset.roomId);
      if (!room?.photos.length) return;
      const index = (Number(card.dataset.roomIndex) + Number(slide.dataset.roomStep) + room.photos.length) % room.photos.length;
      const photo = room.photos[index];
      card.dataset.roomIndex = String(index);
      const link = card.querySelector('.room-photo');
      link.href = photo.src;
      link.dataset.photoIndex = String(index);
      link.querySelector('img').src = photo.thumb || photo.src;
      link.querySelector('img').alt = photo.caption || '';
      card.querySelector('.room-slide-index').textContent = String(index + 1);
      return;
    }
    const link = event.target.closest('[data-gallery-open]');
    if (link) {
      event.preventDefault();
      open(link.dataset.galleryOpen, link.dataset.photoIndex, link);
    }
  });

  const roomCards = [...document.querySelectorAll('.room-card[data-room-id]')];
  const roomFilters = [...document.querySelectorAll('[data-room-filter]')];
  const roomMore = document.querySelector('.room-show-more');
  const roomStatus = document.querySelector('.room-list-status');
  let house = 'all';
  let allRooms = false;
  const renderRooms = () => {
    const matching = roomCards.filter(card => house === 'all' || card.dataset.house === house);
    const visible = new Set(allRooms ? matching : matching.slice(0, 8));
    roomCards.forEach(card => { card.hidden = !visible.has(card); });
    roomFilters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.roomFilter === house)));
    roomStatus.textContent = 'Показано ' + visible.size + ' из ' + matching.length + ' номеров';
    roomMore.hidden = visible.size >= matching.length;
    roomMore.textContent = 'Показать ещё ' + (matching.length - visible.size);
  };
  roomFilters.forEach(button => button.addEventListener('click', () => {
    house = button.dataset.roomFilter;
    allRooms = false;
    renderRooms();
  }));
  roomMore?.addEventListener('click', () => {
    allRooms = true;
    renderRooms();
  });
  renderRooms();

  const tiles = [...document.querySelectorAll('.media-gallery-item')];
  const galleryFilters = [...document.querySelectorAll('[data-gallery-filter]')];
  const galleryMore = document.querySelector('.gallery-show-more');
  const galleryStatus = document.querySelector('.gallery-list-status');
  let category = 'all';
  let allPhotos = false;
  const categoryNames = { territory:'Территория клуба', bath:'Баня', restaurant:'Ресторан', sport:'ФОК «Сокол»', winter:'Зима в клубе' };
  const renderGallery = () => {
    const matching = tiles.filter(tile => category === 'all' || tile.dataset.category === category);
    const visible = new Set(allPhotos ? matching : matching.slice(0, 12));
    const key = category === 'all' ? 'club-gallery' : 'club-category-' + category;
    if (category !== 'all') {
      groups.set(key, { title:categoryNames[category], description:'Галерея клуба «Ермак»', photos:media.general.filter(photo => photo.category === category) });
    }
    tiles.forEach(tile => { tile.hidden = !visible.has(tile); });
    matching.forEach((tile, index) => {
      tile.dataset.galleryOpen = key;
      tile.dataset.photoIndex = String(index);
    });
    galleryFilters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.galleryFilter === category)));
    galleryStatus.textContent = 'Показано ' + visible.size + ' из ' + matching.length + ' фотографий';
    galleryMore.hidden = visible.size >= matching.length;
    galleryMore.textContent = 'Показать ещё ' + (matching.length - visible.size) + ' фото';
  };
  galleryFilters.forEach(button => button.addEventListener('click', () => {
    category = button.dataset.galleryFilter;
    allPhotos = false;
    renderGallery();
  }));
  galleryMore?.addEventListener('click', () => {
    allPhotos = true;
    renderGallery();
  });
  renderGallery();

  // Each section opens its own album. Existing service links remain available.
  [...document.querySelectorAll('main section')].forEach((section, sectionIndex) => {
    if (section.matches('.rooms,.photo-gallery')) return;
    const photos = [...section.querySelectorAll('img')];
    if (!photos.length) return;
    const key = 'section-' + (section.id || sectionIndex);
    const group = {
      title: section.classList.contains('hero') ? 'Залив клуба «Ермак»' : (section.querySelector('h2')?.textContent || 'Фотографии клуба'),
      description:'',
      photos:photos.map(photo => {
        const src = photo.getAttribute('src');
        return { src:media.fullVariants[src] || src, thumb:src, caption:photo.alt };
      })
    };
    groups.set(key, group);
    photos.forEach((photo, index) => {
      const card = photo.closest('.activity-card');
      if (section.classList.contains('hero') || card) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = section.classList.contains('hero') ? 'hero-photo-zoom' : 'photo-zoom-inline';
        button.dataset.galleryOpen = key;
        button.dataset.photoIndex = String(index);
        button.setAttribute('aria-label', 'Увеличить фото: ' + photo.alt);
        button.textContent = section.classList.contains('hero') ? 'Увеличить фото ↗' : '⤢';
        (card || section).append(button);
        return;
      }
      let anchor = photo.closest('a');
      if (!anchor) {
        anchor = document.createElement('a');
        photo.replaceWith(anchor);
        anchor.append(photo);
      }
      anchor.classList.add('photo-open');
      anchor.href = group.photos[index].src;
      anchor.dataset.galleryOpen = key;
      anchor.dataset.photoIndex = String(index);
      anchor.setAttribute('aria-label', 'Увеличить фото: ' + photo.alt);
    });
  });
})();

