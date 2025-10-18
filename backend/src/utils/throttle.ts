export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limitMs: number
): T {
  let lastRun = 0;
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: any[] | null = null;

  return function (this: any, ...args: any[]) {
    const now = Date.now();
    lastArgs = args;

    if (now - lastRun >= limitMs) {
      lastRun = now;
      func.apply(this, args);
    } else {
      if (timeout) {
        clearTimeout(timeout);
      }

      timeout = setTimeout(() => {
        lastRun = Date.now();
        if (lastArgs) {
          func.apply(this, lastArgs);
        }
        timeout = null;
      }, limitMs - (now - lastRun));
    }
  } as T;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delayMs: number
): T {
  let timeout: NodeJS.Timeout | null = null;

  return function (this: any, ...args: any[]) {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func.apply(this, args);
      timeout = null;
    }, delayMs);
  } as T;
}