export namespace MouseTouchEvent {
  export const isTouchEvent = (event: TouchEvent | React.TouchEvent): event is TouchEvent =>
    event?.touches instanceof TouchList;

  export const touchToMouseEvent = (event: Event): MouseEvent | Event => {
    if (!isTouchEvent(event as TouchEvent)) {
      return event as MouseEvent;
    }
    const touchEvent = event as TouchEvent;

    // 默认获取第一个触摸点
    const touch = touchEvent.touches[0] || touchEvent.changedTouches[0];

    if (touchEvent.type === 'touchmove') {
      preventDefault(touchEvent);
    }

    // 确定对应的鼠标事件类型
    const mouseEventType = {
      touchstart: 'mousedown',
      touchmove: 'mousemove',
      touchend: 'mouseup',
      touchcancel: 'mouseup',
    }[touchEvent.type];

    if (!mouseEventType) {
      throw new Error(`Unknown touch event type: ${touchEvent.type}`);
    }

    // 创建新的鼠标事件
    const mouseEvent = new MouseEvent(mouseEventType, {
      bubbles: touchEvent.bubbles,
      cancelable: touchEvent.cancelable,
      view: touchEvent.view,
      // 复制触摸点的位置信息
      clientX: touch.clientX,
      clientY: touch.clientY,
      screenX: touch.screenX,
      screenY: touch.screenY,
      // 复制修饰键状态
      ctrlKey: touchEvent.ctrlKey,
      altKey: touchEvent.altKey,
      shiftKey: touchEvent.shiftKey,
      metaKey: touchEvent.metaKey,
    });

    return mouseEvent;
  };
  export const getEventCoord = (
    e:
      | MouseEvent
      | TouchEvent
      | {
          clientX: number;
          clientY: number;
        }
  ): {
    clientX: number;
    clientY: number;
  } => {
    if (isTouchEvent(e as TouchEvent)) {
      const touchEvent = e as TouchEvent;
      if (touchEvent.touches.length === 0) {
        return {
          clientX: 0,
          clientY: 0,
        };
      }
      return {
        clientX: touchEvent.touches[0].clientX,
        clientY: touchEvent.touches[0].clientY,
      };
    } else if (e instanceof MouseEvent) {
      return {
        clientX: e.clientX,
        clientY: e.clientY,
      };
    }
    return {
      clientX: (e as MouseEvent).clientX,
      clientY: (e as MouseEvent).clientY,
    };
  };

  export const preventDefault = (
    e: Event | MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent
  ) => {
    if (e.cancelable) {
      e.preventDefault();
    }
  };

  export const onTouched = (
    touchStartEvent: React.TouchEvent,
    callback: (e: MouseEvent) => void
  ) => {
    const startTouch = touchStartEvent.changedTouches[0];

    const handleTouchEnd = (touchEndEvent: TouchEvent) => {
      const endTouch = touchEndEvent.changedTouches[0];
      const deltaX = endTouch.clientX - startTouch.clientX;
      const deltaY = endTouch.clientY - startTouch.clientY;
      // 判断是拖拽还是点击
      const delta = 5;
      if (Math.abs(deltaX) < delta && Math.abs(deltaY) < delta) {
        // 触发回调
        const mouseEvent = touchToMouseEvent(touchEndEvent) as MouseEvent;
        callback(mouseEvent);
      }
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };

    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
  };
}
