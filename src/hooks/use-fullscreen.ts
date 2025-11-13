"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type FullscreenAPI = {
  requestFullscreen?: () => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
};

type ExitAPI = {
  exitFullscreen?: () => Promise<void>;
  webkitExitFullscreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
};

function getIsFullscreen(): boolean {
  const doc = document as any;
  return Boolean(
    document.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.msFullscreenElement
  );
}

export default function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enter = useCallback(async () => {
    const el = document.documentElement as FullscreenAPI;
    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if ((el as any).msRequestFullscreen) {
        await (el as any).msRequestFullscreen();
      } else {
        throw new Error("Fullscreen API not supported on this device.");
      }
      localStorage.setItem("app-fullscreen-pref", "on");
      toast.success("Entered fullscreen");
    } catch (e: any) {
      toast.error(e?.message || "Unable to enter fullscreen");
      throw e;
    }
  }, []);

  const exit = useCallback(async () => {
    const doc = document as ExitAPI;
    try {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if ((doc as any).msExitFullscreen) {
        await (doc as any).msExitFullscreen();
      } else {
        throw new Error("Fullscreen exit not supported on this device.");
      }
      localStorage.setItem("app-fullscreen-pref", "off");
      toast.success("Exited fullscreen");
    } catch (e: any) {
      toast.error(e?.message || "Unable to exit fullscreen");
      throw e;
    }
  }, []);

  const toggle = useCallback(async () => {
    if (getIsFullscreen()) {
      await exit();
    } else {
      await enter();
    }
  }, [enter, exit]);

  useEffect(() => {
    const onChange = () => {
      const active = getIsFullscreen();
      setIsFullscreen(active);
      document.body.classList.toggle("fullscreen-active", active);
    };

    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange as EventListener);
    document.addEventListener("msfullscreenchange", onChange as EventListener);

    // Initialize state on mount
    onChange();

    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange as EventListener);
      document.removeEventListener("msfullscreenchange", onChange as EventListener);
    };
  }, []);

  return useMemo(
    () => ({ isFullscreen, enter, exit, toggle }),
    [isFullscreen, enter, exit, toggle]
  );
}