"use client";

import { useEffect, useRef, useState } from "react";
import HanziWriter from "hanzi-writer";

export function HanziWriterAnimator({
  character,
  size = 120,
}: {
  character: string;
  size?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const writerRef = useRef<HanziWriter | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current || !character) {
      return;
    }

    // Clean up previous writer
    if (writerRef.current) {
      // HanziWriter doesn't have an explicit destroy method, but we can clear the innerHTML
      containerRef.current.innerHTML = "";
    }

    writerRef.current = HanziWriter.create(containerRef.current, character, {
      width: size,
      height: size,
      padding: 5,
      showOutline: true,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 50,
      delayBetweenLoops: 2000,
      strokeColor: "#10b981", // emerald-500
      radicalColor: "#0ea5e9", // sky-500
      outlineColor: "rgba(148, 163, 184, 0.4)", // slate-400 with opacity
    });

    writerRef.current.loopCharacterAnimation();

    return () => {
      if (writerRef.current) {
        writerRef.current.cancelQuiz();
        writerRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [character, size, mounted]);

  return (
    <div style={{ width: size, height: size }} className="relative inline-block overflow-hidden rounded-md">
      <svg
        width={size}
        height={size}
        className="pointer-events-none absolute inset-0 z-0 stroke-slate-400/60 dark:stroke-slate-500/60"
        strokeWidth="1"
        strokeDasharray="4 4"
      >
        <line x1={0} y1={0} x2={size} y2={size} />
        <line x1={size} y1={0} x2={0} y2={size} />
        <line x1={size / 2} y1={0} x2={size / 2} y2={size} />
        <line x1={0} y1={size / 2} x2={size} y2={size / 2} />
      </svg>
      <div ref={containerRef} className="absolute inset-0 z-10" />
    </div>
  );
}
