import { useMemo, useRef } from "react";

type Options = {
  delayMs?: number;
  onLongPress: () => void;
};

export function useLongPress(opts: Options) {
  const delay = opts.delayMs ?? 460;
  const timerRef = useRef<number | null>(null);
  const movedRef = useRef(false);

  return useMemo(() => {
    function clear() {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      movedRef.current = false;
    }

    return {
      onPointerDown: () => {
        clear();
        timerRef.current = window.setTimeout(() => {
          if (movedRef.current) return;
          opts.onLongPress();
        }, delay);
      },
      onPointerMove: () => {
        movedRef.current = true;
      },
      onPointerUp: () => clear(),
      onPointerCancel: () => clear(),
      onContextMenu: (e: React.MouseEvent) => {
        // Prevent default context menu from interfering.
        e.preventDefault();
        opts.onLongPress();
      },
    };
  }, [delay, opts]);
}
