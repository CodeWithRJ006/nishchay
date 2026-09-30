export interface TimeSource {
  now(): number;
}

class SystemClock implements TimeSource {
  now() {
    return Date.now();
  }
}

class TestClock implements TimeSource {
  private currentTime: number;

  constructor(initialTime: number) {
    this.currentTime = initialTime;
  }

  now() {
    return this.currentTime;
  }

  advance(ms: number) {
    this.currentTime += ms;
  }

  setTime(time: number) {
    this.currentTime = time;
  }
}

let currentClock: TimeSource = new SystemClock();

export const clock = {
  now: () => currentClock.now(),
  setTestClock: (time: number): TestClock => {
    const tClock = new TestClock(time);
    currentClock = tClock;
    return tClock;
  },
  reset: () => {
    currentClock = new SystemClock();
  }
};
