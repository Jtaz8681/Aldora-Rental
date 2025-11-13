"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2 } from "lucide-react";
import useFullscreen from "@/hooks/use-fullscreen";

export default function FullscreenToggleButton() {
  const { isFullscreen, toggle } = useFullscreen();

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
      onClick={(e) => {
        e.preventDefault();
        toggle();
      }}
      className="ml-2"
    >
      {isFullscreen ? (
        <Minimize2 className="h-5 w-5" />
      ) : (
        <Maximize2 className="h-5 w-5" />
      )}
    </Button>
  );
}