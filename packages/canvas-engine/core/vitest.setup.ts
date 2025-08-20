import 'reflect-metadata';

Object.defineProperty(window, 'TouchList', {
  value: class TouchList {
    constructor(touches: Touch[] = []) {
      touches.forEach((touch, index) => {
        this[index] = touch;
      });
      Object.defineProperty(this, 'length', {
        value: touches.length,
      });
    }
  },
});
