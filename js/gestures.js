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

  let minYDiff = 10;
  let minYMultiple = 2;
  let isVerticalSwipe = false;
  if (Math.abs(yDiff) > minYDiff) {
    if (Math.abs(yDiff) > Math.abs(xDiff) * minYMultiple) {
      isVerticalSwipe = true;
    }
  }

  if (isHorizontalSwipe) {
    if (xDiff > 0) {
      touchEvents.xDown = xUp;
      touchEvents.yDown = yUp;
      return 'left';
    } else {
      touchEvents.xDown = xUp;
      touchEvents.yDown = yUp;
      return 'right';
    }
  }

  if (isVerticalSwipe) {
    if (yDiff > 0) {
      touchEvents.xDown = xUp;
      touchEvents.yDown = yUp;
      return 'up';
    } else {
      touchEvents.xDown = xUp;
      touchEvents.yDown = yUp;
      return 'down';
    }
  }

  // Update the start position for the next swipe
  // touchEvents.xDown = xUp;
  // touchEvents.yDown = yUp;


  // return;
}

