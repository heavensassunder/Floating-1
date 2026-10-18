import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SlimeStatsData } from '../types';
import { chatWithOpenRouter } from '../services/openRouterService';
import confetti from 'canvas-confetti';

interface FloatingSlimeOverlayProps {
  stats: SlimeStatsData;
  onUpdateStats: (newStats: SlimeStatsData) => void;
  onCaptureScreen: () => Promise<string | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isActive: boolean;
  isNightMode?: boolean;
  isCharging?: boolean;
  batteryLevel?: number;
}

export const FloatingSlimeOverlay: React.FC<FloatingSlimeOverlayProps> = ({
  stats,
  onUpdateStats,
  onCaptureScreen,
  containerRef,
  isActive,
  isNightMode = false,
  isCharging = false,
  batteryLevel = 85
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Position on screen
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 30, y: 180 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);

  // Animation values matching SlimeView.kt
  const [mood, setMood] = useState<number>(stats.moodIndex ?? 0);
  const [scale, setScale] = useState<number>(1);
  const [speechMessage, setSpeechMessage] = useState<string | null>("I'm alive! 🧠");

  const bounceRef = useRef<number>(0);
  const squishRef = useRef<number>(0);
  const isBouncingRef = useRef<boolean>(false);
  const idleAngleRef = useRef<number>(0);

  const speechTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const lastInteractionRef = useRef<number>(Date.now());

  // Say method matching SlimeView.say(text)
  const say = useCallback((text: string, durationMs: number = 3800) => {
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    setSpeechMessage(text);
    speechTimerRef.current = setTimeout(() => {
      setSpeechMessage(null);
    }, durationMs);
  }, []);

  // Bounce animation matching SlimeView.bounceAnim()
  const bounceAnim = useCallback(() => {
    if (isBouncingRef.current) return;
    isBouncingRef.current = true;
    const startTime = performance.now();
    const duration = 500;

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const frac = Math.min(1, elapsed / duration);
      bounceRef.current = -Math.sin(frac * Math.PI) * 35; // bounce up
      squishRef.current = Math.sin(frac * Math.PI) * 0.35;

      if (frac < 1) {
        requestAnimationFrame(animate);
      } else {
        bounceRef.current = 0;
        squishRef.current = 0;
        isBouncingRef.current = false;
      }
    };
    requestAnimationFrame(animate);
  }, []);

  // Keep stats in sync with mood
  useEffect(() => {
    if (stats.moodIndex !== undefined && stats.moodIndex !== mood) {
      setMood(stats.moodIndex);
    }
  }, [stats.moodIndex]);

  // Night Mode Simulation (Hour in 22..23 or 0..5 -> Sleepy Zzz)
  useEffect(() => {
    if (isNightMode) {
      setMood(1);
      say("Go sleep! 🌙", 4000);
      bounceAnim();
    }
  }, [isNightMode, say, bounceAnim]);

  // Charging state simulation (ACTION_POWER_CONNECTED)
  useEffect(() => {
    if (isCharging) {
      setMood(3);
      say("Yummy energy! ⚡", 4000);
      bounceAnim();
      setScale(1.25);
      setTimeout(() => setScale(1), 800);
    }
  }, [isCharging, say, bounceAnim]);

  // Battery low simulation (< 15%)
  useEffect(() => {
    if (batteryLevel < 15 && !isCharging) {
      setMood(1);
      say(`I'm tired... 🔋 ${batteryLevel}%`, 4000);
    }
  }, [batteryLevel, isCharging, say]);

  // Idle timer simulation (every 2 minutes of no interaction)
  useEffect(() => {
    const idleCheckInterval = setInterval(() => {
      const idleFor = Date.now() - lastInteractionRef.current;
      if (idleFor > 60000 && isActive) {
        const idleMessages = ["Hey! 😢", "Play with me!", "I'm lonely...", "Tap me!"];
        say(idleMessages[Math.floor(Math.random() * idleMessages.length)]);
        setMood(0);
        bounceAnim();
      }
    }, 45000);
    return () => clearInterval(idleCheckInterval);
  }, [isActive, say, bounceAnim]);

  // Continuous Idle breathing loop matching SlimeView.startIdle()
  useEffect(() => {
    let animId: number;
    const renderLoop = () => {
      idleAngleRef.current = (idleAngleRef.current + 2.5) % 360;

      // If not in a hard bounce, squish with subtle sine wave breathing
      if (!isBouncingRef.current) {
        squishRef.current = Math.sin((idleAngleRef.current * Math.PI) / 180) * 0.05;
      }

      drawSlime();
      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [mood, scale]);

  // Main Canvas Drawing function strictly reproducing the user's SlimeView.onDraw()
  const drawSlime = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2 + bounceRef.current;
    const currentSquish = squishRef.current;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);

    // 1. Shadow underneath the slime:
    // bodyDarkPaint.alpha = 70; rect.set(cx - w*0.4f, cy + h*0.3f, cx + w*0.4f, cy + h*0.45f); canvas.drawOval(rect, bodyDarkPaint);
    ctx.fillStyle = 'rgba(46, 134, 193, 0.35)'; // #2E86C1 with alpha ~70/255
    ctx.beginPath();
    ctx.ellipse(cx, cy + h * 0.36, w * 0.4, h * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Organic Slime Body:
    // val squishH = 1f - squish; val squishW = 1f + squish
    // rect.set(cx - w*0.42f * squishW, cy - h*0.32f * squishH, cx + w*0.42f * squishW, cy + h*0.36f * squishH); canvas.drawOval(rect, bodyPaint)
    const squishH = 1 - currentSquish;
    const squishW = 1 + currentSquish;
    const bodyRadiusX = w * 0.42 * squishW;
    const bodyRadiusY = h * 0.34 * squishH;
    const bodyCenterY = cy + h * 0.02;

    ctx.fillStyle = '#5DADE2'; // Exact bodyPaint color from code
    ctx.beginPath();
    ctx.ellipse(cx, bodyCenterY, bodyRadiusX, bodyRadiusY, 0, 0, Math.PI * 2);
    ctx.fill();

    // Subtle outline for crisp presence
    ctx.strokeStyle = '#2E86C1';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 3. Specular Highlight Oval:
    // rect.set(cx - w*0.28f, cy - h*0.25f, cx - w*0.05f, cy - h*0.05f); canvas.drawOval(rect, highlightPaint)
    const hlX = cx - w * 0.165;
    const hlY = cy - h * 0.15;
    const hlRadiusX = w * 0.115;
    const hlRadiusY = h * 0.1;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.58)'; // alpha 150/255
    ctx.beginPath();
    ctx.ellipse(hlX, hlY, hlRadiusX, hlRadiusY, -Math.PI / 8, 0, Math.PI * 2);
    ctx.fill();

    // Eye coordinates from code
    const eyeY = cy - h * 0.05;
    const leftEyeX = cx - w * 0.16;
    const rightEyeX = cx + w * 0.16;

    // 4. Mood Expressions (0..4)
    switch (mood) {
      case 0: {
        // Mood 0: Normal Happy
        // canvas.drawCircle(leftEyeX, eyeY, w*0.07f, eyeWhitePaint); canvas.drawCircle(leftEyeX, eyeY, w*0.035f, eyePaint)...
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(leftEyeX, eyeY, w * 0.07, 0, Math.PI * 2);
        ctx.arc(rightEyeX, eyeY, w * 0.07, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(leftEyeX, eyeY, w * 0.035, 0, Math.PI * 2);
        ctx.arc(rightEyeX, eyeY, w * 0.035, 0, Math.PI * 2);
        ctx.fill();

        // Smile arc: drawArc(sr, 20f, 140f, false, sp)
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = w * 0.022;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(cx, eyeY + h * 0.11, w * 0.08, 0.25 * Math.PI, 0.75 * Math.PI);
        ctx.stroke();
        break;
      }
      case 1: {
        // Mood 1: Sleepy with straight eye lines + Z z
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = w * 0.022;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(leftEyeX - w * 0.06, eyeY);
        ctx.lineTo(leftEyeX + w * 0.06, eyeY);
        ctx.moveTo(rightEyeX - w * 0.06, eyeY);
        ctx.lineTo(rightEyeX + w * 0.06, eyeY);
        ctx.stroke();

        // Floating "Z" and "z"
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${Math.round(w * 0.12)}px sans-serif`;
        ctx.fillText('Z', cx + w * 0.22, eyeY - h * 0.12);
        ctx.font = `bold ${Math.round(w * 0.09)}px sans-serif`;
        ctx.fillText('z', cx + w * 0.29, eyeY - h * 0.22);
        break;
      }
      case 2: {
        // Mood 2: Angry / Dizzy / Shaken
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(leftEyeX, eyeY, w * 0.07, 0, Math.PI * 2);
        ctx.arc(rightEyeX, eyeY, w * 0.07, 0, Math.PI * 2);
        ctx.fill();

        // Downward pupils
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(leftEyeX, eyeY + h * 0.02, w * 0.04, 0, Math.PI * 2);
        ctx.arc(rightEyeX, eyeY + h * 0.02, w * 0.04, 0, Math.PI * 2);
        ctx.fill();

        // Angry diagonal eyebrows
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = w * 0.025;
        ctx.beginPath();
        ctx.moveTo(leftEyeX - w * 0.08, eyeY - h * 0.08);
        ctx.lineTo(leftEyeX + w * 0.08, eyeY - h * 0.03);
        ctx.moveTo(rightEyeX - w * 0.08, eyeY - h * 0.03);
        ctx.lineTo(rightEyeX + w * 0.08, eyeY - h * 0.08);
        ctx.stroke();

        // Flat stern mouth
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.1, eyeY + h * 0.15);
        ctx.lineTo(cx + w * 0.1, eyeY + h * 0.15);
        ctx.stroke();
        break;
      }
      case 3: {
        // Mood 3: In Love / Excited (Red eyes, heart blush, happy arc)
        ctx.fillStyle = '#E74C3C'; // Red heart eye color from code
        ctx.beginPath();
        ctx.arc(leftEyeX, eyeY, w * 0.05, 0, Math.PI * 2);
        ctx.arc(rightEyeX, eyeY, w * 0.05, 0, Math.PI * 2);
        ctx.fill();

        // Inner blush dots
        ctx.fillStyle = 'rgba(241, 148, 138, 0.5)';
        ctx.beginPath();
        ctx.arc(cx - w * 0.06, eyeY + h * 0.15, w * 0.05, 0, Math.PI * 2);
        ctx.arc(cx + w * 0.06, eyeY + h * 0.15, w * 0.05, 0, Math.PI * 2);
        ctx.fill();

        // Small sweet smile
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = w * 0.02;
        ctx.beginPath();
        ctx.arc(cx, eyeY + h * 0.1, w * 0.055, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
        break;
      }
      case 4: {
        // Mood 4: Yummy / Nom Nom (Fed, open mouth with pink tongue)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(leftEyeX, eyeY, w * 0.07, 0, Math.PI * 2);
        ctx.arc(rightEyeX, eyeY, w * 0.07, 0, Math.PI * 2);
        ctx.fill();

        // Happy upward pupils
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(leftEyeX, eyeY - h * 0.02, w * 0.03, 0, Math.PI * 2);
        ctx.arc(rightEyeX, eyeY - h * 0.02, w * 0.03, 0, Math.PI * 2);
        ctx.fill();

        // Open mouth oval
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.ellipse(cx, eyeY + h * 0.13, w * 0.11, h * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pink tongue oval inside: #F1948A
        ctx.fillStyle = '#F1948A';
        ctx.beginPath();
        ctx.ellipse(cx, eyeY + h * 0.155, w * 0.05, h * 0.035, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }

    // Rosy cheeks (mood != 1)
    if (mood !== 1) {
      ctx.fillStyle = 'rgba(241, 148, 138, 0.5)'; // #F1948A with alpha 120/255
      ctx.beginPath();
      ctx.arc(cx - w * 0.22, eyeY + h * 0.12, w * 0.05, 0, Math.PI * 2);
      ctx.arc(cx + w * 0.22, eyeY + h * 0.12, w * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // Shake trigger external handler (used by Shake simulator button)
  const triggerShakeReaction = useCallback(() => {
    setMood(2);
    bounceAnim();
    const shakeMsgs = ["Stop shaking me!! 🤢", "I'm dizzy! 😵💫", "Noooo!"];
    say(shakeMsgs[Math.floor(Math.random() * shakeMsgs.length)]);
    lastInteractionRef.current = Date.now();
  }, [bounceAnim, say]);

  // Expose shake trigger globally for simulator controls
  useEffect(() => {
    (window as any).__triggerSlimeShake = triggerShakeReaction;
    return () => {
      delete (window as any).__triggerSlimeShake;
    };
  }, [triggerShakeReaction]);

  // Touch Handlers strictly matching FloatingService MotionEvent logic
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    lastInteractionRef.current = Date.now();

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y
    };
    setIsDragging(false);

    // Long press detection for feed (550ms):
    // floatingView?.mood = 4; floatingView?.say("THANK YOU! 🍔"); floatingView?.bounceAnim(); floatingView?.scale = 1.35f
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      setMood(4);
      say("THANK YOU! 🍔", 4000);
      bounceAnim();
      setScale(1.35);
      confetti({ particleCount: 35, spread: 60 });
      setTimeout(() => setScale(1), 600);

      const nextHunger = Math.min(100, stats.hunger + 20);
      const nextHappy = Math.min(100, stats.happiness + 10);
      onUpdateStats({
        ...stats,
        hunger: nextHunger,
        happiness: nextHappy,
        moodIndex: 4,
        lastFed: Date.now()
      });
    }, 550);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;

    if (dx * dx + dy * dy > 80) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      setIsDragging(true);

      const bounds = containerRef.current?.getBoundingClientRect();
      const maxW = bounds ? bounds.width - 100 : 280;
      const maxH = bounds ? bounds.height - 100 : 580;

      setPosition({
        x: Math.max(10, Math.min(maxW, dragStartRef.current.startX + dx)),
        y: Math.max(16, Math.min(maxH, dragStartRef.current.startY + dy))
      });
    }
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;

      if (!isDragging) {
        const now = Date.now();
        if (now - lastTapTimeRef.current < 320) {
          // Double Tap: Screen Vision AI trigger
          handleDoubleTap();
        } else {
          // Single Tap: Bounce, cycle mood, speak
          handleSingleTap();
        }
        lastTapTimeRef.current = now;
      }
    } else if (isDragging) {
      bounceAnim();
    }

    dragStartRef.current = null;
    setIsDragging(false);
  };

  // Single Tap Action
  const handleSingleTap = async () => {
    const nextMood = (mood + 1) % 5;
    setMood(nextMood);
    bounceAnim();

    const moodPhrases: Record<number, string[]> = {
      0: ["Hehe! 😊", "Squish squish!", "Hi there!"],
      1: ["Zzz... 😴", "Sleepy...", "So cozy..."],
      2: ["Grrr! 😠", "Don't poke me!", "Hmph!"],
      3: ["Love you! 🥰", "My hero! <3", "Yay!"],
      4: ["Nom nom! 😋", "Yummy!", "Delicious!"]
    };

    const phrase = moodPhrases[nextMood][Math.floor(Math.random() * moodPhrases[nextMood].length)];
    say(phrase);

    if (nextMood === 4) {
      setScale(1.25);
      setTimeout(() => setScale(1), 1000);
    }

    // Call OpenRouter AI
    const statsSummary = `Mood ${nextMood}, Hunger: ${stats.hunger}%, Happiness: ${stats.happiness}%`;
    const reply = await chatWithOpenRouter(
      `My mood is ${nextMood} and my stats are ${statsSummary}. Say something short and cheeky!`
    );
    say(reply, 5000);

    onUpdateStats({
      ...stats,
      moodIndex: nextMood
    });
  };

  // Double Tap Action: Screen Vision
  const handleDoubleTap = async () => {
    setMood(3);
    bounceAnim();
    say("Looking at your screen... 👁️", 3000);

    try {
      const base64 = await onCaptureScreen();
      const reply = await chatWithOpenRouter(
        "What do you see on my screen? Describe in 2 sentences.",
        base64
      );
      say(reply, 5500);
    } catch {
      say("Couldn't snap the screen right now!", 3000);
    }
  };

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-40 overflow-hidden">
      {/* Native-style Speech Bubble with Directional Tail from SlimeView */}
      {speechMessage && (
        <div
          className="absolute pointer-events-auto transition-all duration-200 transform scale-100"
          style={{
            left: Math.max(10, position.x - 40),
            top: Math.max(12, position.y - 74),
            maxWidth: '250px'
          }}
        >
          <div className="relative bg-white text-slate-900 text-xs font-bold px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-200 text-center leading-snug">
            {speechMessage}
            {/* Tail pointing down to Slime */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[9px] border-t-white" />
          </div>
        </div>
      )}

      {/* Floating Slime View Canvas container */}
      <div
        className="absolute pointer-events-auto cursor-grab active:cursor-grabbing"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '96px',
          height: '96px',
          touchAction: 'none'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <canvas
          ref={canvasRef}
          width={96}
          height={96}
          className="w-full h-full drop-shadow-md"
        />

        {/* Small Mood Indicator Tag */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-slate-900/90 text-[9px] px-2 py-0.5 rounded-full text-white font-mono border border-slate-700 shadow flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          <span>
            {mood === 0
              ? 'Happy'
              : mood === 1
              ? 'Sleepy'
              : mood === 2
              ? 'Angry'
              : mood === 3
              ? 'Love'
              : 'NomNom'}
          </span>
        </div>
      </div>
    </div>
  );
};
