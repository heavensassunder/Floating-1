import React, { useRef, useState } from 'react';
import { MockAppScreen, SlimeStatsData } from '../types';
import { FloatingSlimeOverlay } from './FloatingSlimeOverlay';
import { ComposeMainActivity } from './ComposeMainActivity';
import {
  Wifi,
  Battery,
  BatteryCharging,
  Signal,
  Home,
  Globe,
  Image as ImageIcon,
  FileText,
  Settings,
  Camera,
  Vibrate,
  Moon,
  Sun,
  Zap,
  Utensils
} from 'lucide-react';

interface PhoneSimulatorProps {
  stats: SlimeStatsData;
  onUpdateStats: (newStats: SlimeStatsData) => void;
  isServiceRunning: boolean;
  onToggleService: (start: boolean) => void;
  hasOverlayPermission: boolean;
  hasMediaPermission: boolean;
  onRequestPermissions: () => void;
}

export const PhoneSimulator: React.FC<PhoneSimulatorProps> = ({
  stats,
  onUpdateStats,
  isServiceRunning,
  onToggleService,
  hasOverlayPermission,
  hasMediaPermission,
  onRequestPermissions
}) => {
  const [currentScreen, setCurrentScreen] = useState<MockAppScreen>('main_activity');
  const [screenFlash, setScreenFlash] = useState(false);
  const phoneScreenRef = useRef<HTMLDivElement | null>(null);

  // Environmental Hardware Simulation States (from user's code)
  const [isNightMode, setIsNightMode] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(88);
  const [isShaking, setIsShaking] = useState(false);

  // Trigger simulated shake
  const handleSimulateShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);

    if (typeof (window as any).__triggerSlimeShake === 'function') {
      (window as any).__triggerSlimeShake();
    }
  };

  // Toggle charging state
  const handleToggleCharging = () => {
    setIsCharging((prev) => !prev);
  };

  // Toggle Day/Night clock
  const handleToggleNightMode = () => {
    setIsNightMode((prev) => !prev);
  };

  // Trigger feed snack directly
  const handleFeedSnack = () => {
    const nextHunger = Math.min(100, stats.hunger + 20);
    const nextHappy = Math.min(100, stats.happiness + 15);
    onUpdateStats({
      ...stats,
      hunger: nextHunger,
      happiness: nextHappy,
      moodIndex: 4,
      lastFed: Date.now()
    });
  };

  // Capture current phone screen as base64 for Vision API
  const handleCaptureScreen = async (): Promise<string | null> => {
    setScreenFlash(true);
    setTimeout(() => setScreenFlash(false), 280);

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 700;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      const grad = ctx.createLinearGradient(0, 0, 0, 700);
      grad.addColorStop(0, isNightMode ? '#030712' : '#0F172A');
      grad.addColorStop(1, isNightMode ? '#0B1329' : '#1E293B');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 400, 700);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(`Screen: ${currentScreen.toUpperCase()}`, 30, 80);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '14px sans-serif';

      if (currentScreen === 'browser') {
        ctx.fillStyle = '#38BDF8';
        ctx.fillRect(30, 110, 340, 160);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('Exploring Nebula Clusters in Deep Space', 45, 160);
        ctx.fillStyle = '#E2E8F0';
        ctx.font = '13px sans-serif';
        ctx.fillText('Astronomers using James Webb Telescope reveal...', 45, 195);
      } else if (currentScreen === 'gallery') {
        ctx.fillStyle = '#10B981';
        ctx.fillRect(30, 110, 160, 160);
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(210, 110, 160, 160);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('Sunset Mountain Peak', 40, 290);
        ctx.fillText('Golden Desert Dunes', 220, 290);
      } else if (currentScreen === 'notes') {
        ctx.fillStyle = '#E2E8F0';
        ctx.font = '16px monospace';
        ctx.fillText('class SlimeView(context: Context) : View(context) {', 40, 140);
        ctx.fillText('  fun bounceAnim() { /* ValueAnimator */ }', 40, 175);
        ctx.fillText('  fun say("I\'m alive! 🧠")', 40, 210);
        ctx.fillText('}', 40, 245);
      } else {
        ctx.fillStyle = '#5DADE2';
        ctx.beginPath();
        ctx.arc(200, 300, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('Floating Buddy AI Dashboard', 80, 400);
      }

      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      return dataUrl.split(',')[1];
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center gap-6 p-2 sm:p-4 max-w-6xl mx-auto w-full">
      {/* LEFT: Phone Simulator */}
      <div className="flex flex-col items-center">
        {/* App Switcher Bar above the phone */}
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-800/80 rounded-2xl border border-slate-700/70 mb-3 max-w-md w-full overflow-x-auto shadow-md">
          <span className="text-[11px] font-semibold text-slate-400 pl-2 pr-1 shrink-0">
            Open App:
          </span>
          <button
            onClick={() => setCurrentScreen('main_activity')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium transition-all shrink-0 ${
              currentScreen === 'main_activity'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-700/60'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Buddy App
          </button>
          <button
            onClick={() => setCurrentScreen('home')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium transition-all shrink-0 ${
              currentScreen === 'home'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-700/60'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            Home
          </button>
          <button
            onClick={() => setCurrentScreen('browser')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium transition-all shrink-0 ${
              currentScreen === 'browser'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-700/60'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Browser
          </button>
          <button
            onClick={() => setCurrentScreen('gallery')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium transition-all shrink-0 ${
              currentScreen === 'gallery'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-700/60'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Gallery
          </button>
          <button
            onClick={() => setCurrentScreen('notes')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium transition-all shrink-0 ${
              currentScreen === 'notes'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-300 hover:bg-slate-700/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Code
          </button>
        </div>

        {/* Realistic Smartphone Shell */}
        <div
          className={`relative w-[360px] sm:w-[380px] h-[680px] sm:h-[720px] bg-slate-950 rounded-[44px] p-3 shadow-2xl border-4 border-slate-700/80 ring-1 ring-white/10 flex flex-col overflow-hidden transition-transform duration-200 ${
            isShaking ? 'animate-bounce' : ''
          }`}
        >
          {/* Screen Bezel & Container */}
          <div
            ref={phoneScreenRef}
            className={`relative flex-1 w-full h-full rounded-[34px] overflow-hidden flex flex-col select-none transition-colors duration-500 ${
              isNightMode ? 'bg-[#0B1120]' : 'bg-slate-900'
            }`}
          >
            {/* Flash animation on screenshot double tap */}
            {screenFlash && (
              <div className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-300 opacity-90 animate-out fade-out" />
            )}

            {/* Android Status Bar */}
            <div className="h-8 bg-slate-950/80 backdrop-blur text-white flex items-center justify-between px-5 text-[11px] font-medium z-30 shrink-0">
              <span>{isNightMode ? '23:45' : '12:45'}</span>
              {/* Camera Punch Hole */}
              <div className="w-3.5 h-3.5 rounded-full bg-black border border-slate-800" />
              <div className="flex items-center gap-1.5">
                <Signal className="w-3 h-3" />
                <Wifi className="w-3 h-3" />
                {isCharging ? (
                  <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Battery className="w-3.5 h-3.5 text-slate-300" />
                )}
                <span className="text-[10px] text-slate-400">{batteryLevel}%</span>
              </div>
            </div>

            {/* Screen Content Container */}
            <div className="relative flex-1 w-full overflow-hidden">
              {/* Screen 1: Compose MainActivity */}
              {currentScreen === 'main_activity' && (
                <ComposeMainActivity
                  stats={stats}
                  onUpdateStats={onUpdateStats}
                  isServiceRunning={isServiceRunning}
                  onToggleService={onToggleService}
                  onRequestPermissions={onRequestPermissions}
                  hasOverlayPermission={hasOverlayPermission}
                  hasMediaPermission={hasMediaPermission}
                />
              )}

              {/* Screen 2: Android Home Screen */}
              {currentScreen === 'home' && (
                <div
                  className={`h-full w-full p-5 flex flex-col justify-between text-white transition-colors duration-500 ${
                    isNightMode
                      ? 'bg-gradient-to-br from-indigo-950 via-slate-950 to-purple-950'
                      : 'bg-gradient-to-br from-sky-950 via-slate-900 to-indigo-950'
                  }`}
                >
                  <div className="pt-8 text-center">
                    <div className="text-5xl font-extralight tracking-tight font-sans">
                      {isNightMode ? '23:45' : '12:45'}
                    </div>
                    <div className="text-xs text-slate-300 mt-1">
                      {isNightMode ? 'Night Time 🌙 • 58°F Chilly' : 'Sunny Day ☀️ • 72°F Pleasant'}
                    </div>
                  </div>

                  <div className="bg-slate-800/80 border border-slate-700/60 rounded-full px-4 py-2.5 flex items-center justify-between text-xs text-slate-300 shadow-md">
                    <span className="flex items-center gap-2">
                      <span className="text-sky-400 font-bold">G</span> Search or type URL...
                    </span>
                    <Camera className="w-3.5 h-3.5 text-slate-400" />
                  </div>

                  <div className="grid grid-cols-4 gap-4 pb-2">
                    <button
                      onClick={() => setCurrentScreen('main_activity')}
                      className="flex flex-col items-center gap-1 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-400 to-blue-600 flex items-center justify-center text-xl shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
                        💧
                      </div>
                      <span className="text-[11px] text-slate-200 truncate w-full text-center">
                        Slime AI
                      </span>
                    </button>

                    <button
                      onClick={() => setCurrentScreen('browser')}
                      className="flex flex-col items-center gap-1 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
                        <Globe className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] text-slate-200">Browser</span>
                    </button>

                    <button
                      onClick={() => setCurrentScreen('gallery')}
                      className="flex flex-col items-center gap-1 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 group-hover:scale-105 transition-transform">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] text-slate-200">Gallery</span>
                    </button>

                    <button
                      onClick={() => setCurrentScreen('notes')}
                      className="flex flex-col items-center gap-1 group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                        <FileText className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] text-slate-200">Notes</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Screen 3: Mock Web Browser */}
              {currentScreen === 'browser' && (
                <div className="h-full w-full bg-slate-900 text-slate-100 flex flex-col">
                  <div className="p-3 bg-slate-800 border-b border-slate-700 flex items-center gap-2">
                    <div className="flex-1 bg-slate-900 px-3 py-1.5 rounded-lg text-xs text-slate-300 truncate border border-slate-700 flex items-center gap-1.5">
                      <span className="text-sky-400">🔒</span>
                      https://nature-science.org/space-nebula
                    </div>
                  </div>
                  <div className="p-4 overflow-y-auto space-y-3">
                    <span className="text-[10px] bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded-full border border-purple-700 font-semibold">
                      ASTRONOMY REPORT
                    </span>
                    <h2 className="text-lg font-bold text-white">
                      Discovering the Pillars of Star Birth in the Carina Nebula
                    </h2>
                    <div className="w-full h-36 bg-gradient-to-r from-purple-900 via-indigo-900 to-cyan-900 rounded-xl flex items-center justify-center border border-purple-500/30 text-xs text-purple-200">
                      🌌 [Deep Space Nebula Photograph - Carina 2026]
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Massive infrared bursts captured by new deep-field arrays provide unprecedented
                      clarity into cosmic dust nurseries.
                    </p>
                    <p className="text-xs text-slate-400">
                      💡 Tip: Double tap Slime to test vision recognition on this article!
                    </p>
                  </div>
                </div>
              )}

              {/* Screen 4: Mock Gallery */}
              {currentScreen === 'gallery' && (
                <div className="h-full w-full bg-slate-950 text-slate-100 p-4 overflow-y-auto">
                  <h2 className="text-base font-bold mb-3 flex items-center justify-between">
                    <span>Photo Library</span>
                    <span className="text-xs text-slate-400">12 Photos</span>
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="aspect-square bg-gradient-to-tr from-emerald-800 to-teal-600 rounded-xl p-2 flex flex-col justify-end text-[11px] font-semibold">
                      🌲 Alpine Pine Forest
                    </div>
                    <div className="aspect-square bg-gradient-to-tr from-amber-700 to-yellow-600 rounded-xl p-2 flex flex-col justify-end text-[11px] font-semibold">
                      🏜️ Sunset Canyon
                    </div>
                    <div className="aspect-square bg-gradient-to-tr from-blue-800 to-cyan-600 rounded-xl p-2 flex flex-col justify-end text-[11px] font-semibold">
                      🌊 Coral Reef Bay
                    </div>
                    <div className="aspect-square bg-gradient-to-tr from-pink-800 to-rose-600 rounded-xl p-2 flex flex-col justify-end text-[11px] font-semibold">
                      🌸 Cherry Blossoms
                    </div>
                  </div>
                </div>
              )}

              {/* Screen 5: Mock Code Notes */}
              {currentScreen === 'notes' && (
                <div className="h-full w-full bg-slate-950 text-slate-200 p-4 font-mono text-xs overflow-y-auto">
                  <div className="text-slate-400 text-[11px] mb-2">// SlimeView.kt Prototype</div>
                  <pre className="text-sky-400 bg-slate-900 p-3 rounded-xl border border-slate-800 overflow-x-auto text-[11px]">
{`class SlimeView(context: Context) : View(context) {
    var squish = 0f
    var bounce = 0f
    var mood = 0 // 0: Happy, 1: Sleepy, 2: Angry, 3: Love, 4: Yummy
    fun bounceAnim() { /* ValueAnimator */ }
    fun say(text: String) { message = text; invalidate() }
}`}
                  </pre>
                  <div className="mt-3 text-slate-400 text-xs">
                    Slime companion floats over any app! Drag anywhere!
                  </div>
                </div>
              )}

              {/* THE EXACT SLIME VIEW OVERLAY */}
              <FloatingSlimeOverlay
                stats={stats}
                onUpdateStats={onUpdateStats}
                onCaptureScreen={handleCaptureScreen}
                containerRef={phoneScreenRef}
                isActive={isServiceRunning}
                isNightMode={isNightMode}
                isCharging={isCharging}
                batteryLevel={batteryLevel}
              />
            </div>

            {/* Android Navigation Gesture Pill Bar */}
            <div className="h-6 bg-slate-950 flex items-center justify-center shrink-0 z-30">
              <button
                onClick={() => setCurrentScreen('home')}
                className="w-28 h-1 bg-slate-600 rounded-full hover:bg-slate-400 transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Android Sensor & Hardware Simulation Controller */}
      <div className="w-full lg:w-80 space-y-3">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              Hardware & Environment Lab
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Sensors / Power</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Test the real Android hardware event receivers directly on the Slime:
          </p>

          {/* 1. Accelerometer Shake Event */}
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Vibrate className="w-4 h-4 text-amber-400" />
                <span>Shake Device (Sensor)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Triggers gForce &gt; 2.5 (Mood 2: Dizzy)</p>
            </div>
            <button
              onClick={handleSimulateShake}
              className="bg-amber-600 hover:bg-amber-500 active:scale-95 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow"
            >
              Shake!
            </button>
          </div>

          {/* 2. Battery Charging Event */}
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-emerald-400" />
                <span>Power Connected</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isCharging ? 'Plugged In ⚡ (Mood 3: Love)' : 'Unplugged (Battery mode)'}
              </p>
            </div>
            <button
              onClick={handleToggleCharging}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow ${
                isCharging
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
            >
              {isCharging ? 'Unplug' : 'Plug In'}
            </button>
          </div>

          {/* 3. Battery Level Slider */}
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Battery Level</span>
              <span
                className={`font-bold ${
                  batteryLevel < 15 ? 'text-red-400 animate-pulse' : 'text-slate-300'
                }`}
              >
                {batteryLevel}% {batteryLevel < 15 ? '(Tired Mood 1)' : ''}
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              value={batteryLevel}
              onChange={(e) => setBatteryLevel(Number(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer"
            />
            <span className="text-[10px] text-slate-400 block">
              Slide below 15% to trigger: "I'm tired... 🔋"
            </span>
          </div>

          {/* 4. Day / Night Circadian Clock */}
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                {isNightMode ? (
                  <Moon className="w-4 h-4 text-indigo-400" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
                <span>Circadian Clock</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isNightMode ? 'Night (23:45) -> "Go sleep! 🌙"' : 'Day (12:45) -> Active'}
              </p>
            </div>
            <button
              onClick={handleToggleNightMode}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow ${
                isNightMode
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'bg-amber-600 hover:bg-amber-500 text-white'
              }`}
            >
              {isNightMode ? 'Day Mode' : 'Night Mode'}
            </button>
          </div>

          {/* 5. Quick Feed Action (Long Press simulation) */}
          <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700/60 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Utensils className="w-4 h-4 text-rose-400" />
                <span>Feed Slime (Hold 550ms)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Mood 4: Yummy tongue out 🍔</p>
            </div>
            <button
              onClick={handleFeedSnack}
              className="bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow"
            >
              Feed 🍔
            </button>
          </div>
        </div>

        {/* Gestures Quick Info */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 text-xs text-slate-400 space-y-1 shadow-lg">
          <div className="text-white font-semibold mb-1">Direct Touch on Phone Screen:</div>
          <div>👆 <strong>Single Tap:</strong> Cycle mood & AI prompt response</div>
          <div>✌️ <strong>Double Tap:</strong> Snapshot screen & AI vision analysis</div>
          <div>⏱️ <strong>Hold 550ms:</strong> Feed slime (scale 1.35x + nom nom)</div>
          <div>🖐️ <strong>Drag:</strong> Move anywhere with floor shadow</div>
        </div>
      </div>
    </div>
  );
};
