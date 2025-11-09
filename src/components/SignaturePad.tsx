"use client";

import React, { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";

type Props = {
  onChange: (dataUrl: string) => void;
};

export default function SignaturePad({ onChange }: Props) {
  const ref = useRef<SignatureCanvas | null>(null);

  const clear = () => {
    ref.current?.clear();
    onChange("");
  };

  const save = () => {
    const canvas = ref.current?.getCanvas();
    const dataUrl = canvas ? canvas.toDataURL("image/png") : "";
    onChange(dataUrl);
  };

  return (
    <div className="space-y-2">
      <div className="border rounded bg-muted">
        <SignatureCanvas
          ref={ref as any}
          penColor="black"
          canvasProps={{ width: 600, height: 200, className: "w-full h-48" }}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" type="button" onClick={clear}>Clear</Button>
        <Button type="button" onClick={save}>Save Signature</Button>
      </div>
    </div>
  );
}