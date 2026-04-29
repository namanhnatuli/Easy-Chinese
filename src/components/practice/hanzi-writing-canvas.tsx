"use client";

import { useEffect, useRef } from "react";

function drawGrid(context: CanvasRenderingContext2D, width: number, height: number) {
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#f8fafc";
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(148, 163, 184, 0.6)";
  context.lineWidth = 1;
  context.setLineDash([6, 8]);

  context.beginPath();
  context.moveTo(width / 2, 0);
  context.lineTo(width / 2, height);
  context.moveTo(0, height / 2);
  context.lineTo(width, height / 2);
  context.moveTo(0, 0);
  context.lineTo(width, height);
  context.moveTo(width, 0);
  context.lineTo(0, height);
  context.stroke();

  context.setLineDash([]);
  context.strokeStyle = "rgba(148, 163, 184, 0.8)";
  context.strokeRect(0.5, 0.5, width - 1, height - 1);
}

function drawGuideCharacter(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  guideCharacter: string,
) {
  context.save();
  context.fillStyle = "rgba(148, 163, 184, 0.18)";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${Math.floor(Math.min(width, height) * 0.58)}px serif`;
  context.fillText(guideCharacter, width / 2, height / 2);
  context.restore();
}

export function HanziWritingCanvas({
  clearSignal,
  showGrid = true,
  showGuideOverlay = true,
  guideCharacter,
}: {
  clearSignal: number;
  showGrid?: boolean;
  showGuideOverlay?: boolean;
  guideCharacter?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 8;
    context.strokeStyle = "#0f172a";
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#f8fafc";
    context.fillRect(0, 0, width, height);

    if (showGrid) {
      drawGrid(context, width, height);
    }

    if (showGuideOverlay && guideCharacter) {
      drawGuideCharacter(context, width, height, guideCharacter);
    }
  }, [clearSignal, guideCharacter, showGrid, showGuideOverlay]);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) {
      return;
    }

    const context = element.getContext("2d");
    if (!context) {
      return;
    }

    const canvas = element;
    const ctx = context;

    function getPoint(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    }

    function handlePointerDown(event: PointerEvent) {
      const point = getPoint(event);
      drawingRef.current = true;
      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
    }

    function handlePointerMove(event: PointerEvent) {
      if (!drawingRef.current) {
        return;
      }

      const point = getPoint(event);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }

    function handlePointerUp(event: PointerEvent) {
      if (!drawingRef.current) {
        return;
      }

      handlePointerMove(event);
      drawingRef.current = false;
      ctx.closePath();
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    }

    function handlePointerCancel(event: PointerEvent) {
      if (!drawingRef.current) {
        return;
      }

      drawingRef.current = false;
      ctx.closePath();
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    }

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("pointerleave", handlePointerUp);
    canvas.addEventListener("pointercancel", handlePointerCancel);

    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerUp);
      canvas.removeEventListener("pointercancel", handlePointerCancel);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="h-[20rem] w-full touch-none rounded-[1.5rem] bg-slate-50 shadow-inner sm:h-[24rem]"
      aria-label="Hanzi writing canvas"
    />
  );
}
