/** A half-open span of local wall-clock time: minutes after local midnight. */
export type MinuteWindow = { start: number; end: number };

/** Sorts windows and joins any that overlap or touch. */
export const mergeWindows = (windows: readonly MinuteWindow[]): MinuteWindow[] =>
  [...windows]
    .sort((a, b) => a.start - b.start)
    .reduce<MinuteWindow[]>((merged, window) => {
      const last = merged.at(-1);
      return last && window.start <= last.end
        ? [...merged.slice(0, -1), { start: last.start, end: Math.max(last.end, window.end) }]
        : [...merged, window];
    }, []);

/** Removes `cut` from each window, splitting a window that it falls inside. */
export const subtractWindow = (
  windows: readonly MinuteWindow[],
  cut: MinuteWindow,
): MinuteWindow[] =>
  windows.flatMap((window) =>
    cut.end <= window.start || cut.start >= window.end
      ? [window]
      : [
          { start: window.start, end: cut.start },
          { start: cut.end, end: window.end },
        ].filter((part) => part.start < part.end),
  );
