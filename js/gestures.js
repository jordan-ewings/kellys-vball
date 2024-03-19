export const touchEvents = {

  xDown: null,
  yDown: null,

  getTouches(evt) {

    return evt.touches ||
      evt.originalEvent.touches;
  }
}


export function handleTouchStart(evt) {

  const firstTouch = touchEvents.getTouches(evt)[0];
  touchEvents.xDown = firstTouch.clientX;
  touchEvents.yDown = firstTouch.clientY;
}

export function handleTouchMove(evt) {

  if (!touchEvents.xDown || !touchEvents.yDown) return;

  let xUp = evt.touches[0].clientX;
  let yUp = evt.touches[0].clientY;
  let xDiff = touchEvents.xDown - xUp;
  let yDiff = touchEvents.yDown - yUp;

  let minXDiff = 100;
  let minXMultiple = 2;

  let isHorizontalSwipe = false;
  if (Math.abs(xDiff) > minXDiff) {
    if (Math.abs(xDiff) > Math.abs(yDiff) * minXMultiple) {
      isHorizontalSwipe = true;
    }
  }

  if (!isHorizontalSwipe) return;

  // reset values before returning
  touchEvents.xDown = null;
  touchEvents.yDown = null;

  if (xDiff > 0) {
    return 'left';
  } else {
    return 'right';
  }
}

