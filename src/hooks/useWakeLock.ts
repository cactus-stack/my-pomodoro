import { useEffect, useState } from "react";

export function useWakeLock(active: boolean): boolean {
  const [isHeld, setIsHeld] = useState(false);

  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) {
      setIsHeld(false);
      return;
    }

    const { wakeLock } = navigator;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function requestWakeLock() {
      if (document.visibilityState !== "visible" || !wakeLock) return;
      try {
        const nextSentinel = await wakeLock.request("screen");
        if (cancelled) {
          await nextSentinel.release();
          return;
        }
        sentinel = nextSentinel;
        setIsHeld(true);
        nextSentinel.addEventListener(
          "release",
          () => {
            if (sentinel === nextSentinel) sentinel = null;
            setIsHeld(false);
          },
          { once: true },
        );
      } catch {
        setIsHeld(false);
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && !sentinel) {
        void requestWakeLock();
      }
    }

    void requestWakeLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (sentinel) void sentinel.release();
      setIsHeld(false);
    };
  }, [active]);

  return isHeld;
}
