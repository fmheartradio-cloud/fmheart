"use client";

import { useEffect, useRef } from "react";
import { useRadio } from "@/context/RadioProvider";

type Props = {
  className?: string;
};

const BAR_COUNT = 48;

/** Map analyser FFT bins onto log-spaced display bars (0..1). */
function fillLogBars(
  freq: Uint8Array<ArrayBuffer>,
  sampleRate: number,
  out: Float32Array,
) {
  const binCount = freq.length;
  const nyquist = sampleRate / 2;
  const minHz = 30;
  const maxHz = Math.min(16_000, nyquist);

  for (let i = 0; i < out.length; i++) {
    const t0 = i / out.length;
    const t1 = (i + 1) / out.length;
    const f0 = minHz * Math.pow(maxHz / minHz, t0);
    const f1 = minHz * Math.pow(maxHz / minHz, t1);
    const b0 = Math.max(0, Math.floor((f0 / nyquist) * binCount));
    const b1 = Math.min(binCount - 1, Math.ceil((f1 / nyquist) * binCount));

    let sum = 0;
    let n = 0;
    for (let b = b0; b <= b1; b++) {
      sum += freq[b]!;
      n++;
    }
    const avg = n > 0 ? sum / n / 255 : 0;
    out[i] = Math.pow(avg, 1.05);
  }
}

/** Simulated EQ when Safari/iOS can't expose live-stream FFT (WebKit limitation). */
function fillSimulatedBars(
  out: Float32Array,
  now: number,
  volume: number,
  playing: boolean,
) {
  if (!playing) {
    for (let i = 0; i < out.length; i++) {
      const t = i / (out.length - 1);
      out[i] = 0.03 * (0.7 + 0.3 * Math.exp(-Math.pow((t - 0.25) / 0.4, 2)));
    }
    return;
  }

  const t = now / 1000;
  const vol = 0.55 + Math.min(1, Math.max(0.15, volume)) * 0.55;

  for (let i = 0; i < out.length; i++) {
    const x = i / (out.length - 1);
    // Bass / mid / presence envelope (radio-like)
    const bass = Math.exp(-Math.pow((x - 0.12) / 0.14, 2));
    const mid = Math.exp(-Math.pow((x - 0.42) / 0.22, 2));
    const high = Math.exp(-Math.pow((x - 0.78) / 0.2, 2));
    const shape = 0.35 * bass + 0.55 * mid + 0.4 * high;

    const pulse =
      0.55 +
      0.25 * Math.sin(t * 5.2 + x * 9) +
      0.2 * Math.sin(t * 8.7 + x * 17) +
      0.15 * Math.sin(t * 13.1 + i * 0.7);
    const flutter =
      0.5 + 0.5 * Math.sin(t * 21 + i * 1.3) * Math.sin(t * 3.4 + x * 5);

    let v = shape * (0.45 + 0.55 * pulse) * (0.75 + 0.25 * flutter) * vol;
    // Occasional transient peaks
    const hit = Math.sin(t * 2.15 + i * 0.31);
    if (hit > 0.92) v *= 1.35;
    out[i] = Math.min(1, Math.max(0.04, v));
  }
}

/**
 * Spectrum: real AnalyserNode on Chromium; simulated motion on Apple WebKit
 * (Safari cannot FFT live Icecast via createMediaElementSource without muting).
 */
export function RadioSpectrum({ className }: Props) {
  const { isPlaying, isLoading, analyser, volume } = useRadio();
  const active = isPlaying || isLoading;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const peaksRef = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  const levelsRef = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  const targetsRef = useRef<Float32Array>(new Float32Array(BAR_COUNT));
  const freqRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const peaks = peaksRef.current;
    const levels = levelsRef.current;
    const targets = targetsRef.current;

    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width * dpr));
      const h = Math.max(1, Math.floor(rect.height * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    };

    const draw = (now: number) => {
      resize();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const w = canvas.width;
      const h = canvas.height;
      const pad = Math.max(4, Math.floor(Math.min(w, h) * 0.04));
      const plotW = w - pad * 2;
      const plotH = h - pad * 2;

      let hasSignal = false;
      if (analyser && active) {
        const binCount = analyser.frequencyBinCount;
        if (!freqRef.current || freqRef.current.length !== binCount) {
          freqRef.current = new Uint8Array(binCount);
        }
        analyser.getByteFrequencyData(freqRef.current);
        fillLogBars(freqRef.current, analyser.context.sampleRate, targets);

        let energy = 0;
        for (let i = 0; i < targets.length; i++) energy += targets[i]!;
        energy /= targets.length;
        hasSignal = energy > 0.02;

        const volScale = 0.75 + Math.min(1, volume) * 0.35;
        for (let i = 0; i < targets.length; i++) {
          targets[i]! *= volScale;
        }
      }

      if (!hasSignal) {
        fillSimulatedBars(targets, now, volume, active);
      }

      const lively = active && (hasSignal || isPlaying);
      const attack = lively ? 0.28 : 0.08;
      const release = lively ? 0.16 : 0.07;
      const peakFall = lively ? 0.55 : 0.35;

      for (let i = 0; i < BAR_COUNT; i++) {
        const target = Math.min(1, targets[i]!);
        const rate = target > levels[i]! ? attack : release;
        levels[i]! += (target - levels[i]!) * (1 - Math.exp(-rate * dt * 60));

        if (levels[i]! > peaks[i]!) peaks[i] = levels[i]!;
        else peaks[i]! = Math.max(0, peaks[i]! - dt * peakFall);
      }

      ctx.clearRect(0, 0, w, h);

      const glow = ctx.createRadialGradient(
        pad + plotW * 0.5,
        pad + plotH * 0.75,
        10,
        pad + plotW * 0.5,
        pad + plotH,
        plotW * 0.7,
      );
      glow.addColorStop(0, "rgba(0, 180, 255, 0.12)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= 6; i++) {
        const y = pad + (plotH * i) / 6;
        ctx.beginPath();
        ctx.moveTo(pad, y);
        ctx.lineTo(pad + plotW, y);
        ctx.stroke();
      }
      for (let i = 0; i <= 8; i++) {
        const x = pad + (plotW * i) / 8;
        ctx.beginPath();
        ctx.moveTo(x, pad);
        ctx.lineTo(x, pad + plotH);
        ctx.stroke();
      }

      const gap = Math.max(1, (plotW / BAR_COUNT) * 0.22);
      const barW = plotW / BAR_COUNT - gap;

      for (let i = 0; i < BAR_COUNT; i++) {
        const x = pad + i * (barW + gap);
        const level = levels[i]!;
        const barH = Math.max(2, level * plotH * 0.92);
        const y = pad + plotH - barH;

        const grad = ctx.createLinearGradient(0, y + barH, 0, y);
        grad.addColorStop(0, "#0a3d7a");
        grad.addColorStop(0.45, "#0ea5e9");
        grad.addColorStop(1, "#67e8f9");
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barW, barH);

        const peakH = peaks[i]! * plotH * 0.92;
        const py = pad + plotH - peakH;
        ctx.fillStyle = "rgba(186, 245, 255, 0.95)";
        ctx.fillRect(x, Math.max(pad, py - 2), barW, 2);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, analyser, volume, isPlaying]);

  return (
    <div
      className={
        className ??
        "relative h-[110px] w-full overflow-hidden rounded-md border border-white/10 bg-[#070b12]"
      }
      aria-hidden
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
