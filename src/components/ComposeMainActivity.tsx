import React, { useState } from 'react';
import { SlimeStatsData } from '../types';
import { chatWithOpenRouter, getStoredApiKey, saveStoredApiKey } from '../services/openRouterService';
import { Eye, EyeOff, Lock, Play, Square, Sparkles, Check, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ComposeMainActivityProps {
  stats: SlimeStatsData;
  onUpdateStats: (newStats: SlimeStatsData) => void;
  isServiceRunning: boolean;
  onToggleService: (start: boolean) => void;
  onRequestPermissions: () => void;
  hasOverlayPermission: boolean;
  hasMediaPermission: boolean;
}

export const ComposeMainActivity: React.FC<ComposeMainActivityProps> = ({
  stats,
  onUpdateStats,
  isServiceRunning,
  onToggleService,
  onRequestPermissions,
  hasOverlayPermission,
  hasMediaPermission
}) => {
  const [apiKey, setApiKey] = useState<string>(getStoredApiKey());
  const [showPassword, setShowPassword] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSaveKey = () => {
    saveStoredApiKey(apiKey);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
    showToast('OpenRouter API Key saved securely to SharedPreferences!');
  };

  const handleTestApi = async () => {
    if (!apiKey.trim()) {
      showToast('Squish! Enter an API key first, or leave blank to test smart simulation mode.');
    }
    setIsTestingApi(true);
    saveStoredApiKey(apiKey);
    try {
      const res = await chatWithOpenRouter('hi', null, apiKey);
      showToast(`AI Test Reply: ${res}`);
    } catch (e: any) {
      showToast(`Test failed: ${e.message}`);
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleStartService = () => {
    if (!hasOverlayPermission || !hasMediaPermission) {
      onRequestPermissions();
      return;
    }
    onToggleService(true);
    confetti({ particleCount: 25, spread: 50 });
    showToast('Slime companion summoned! Look for your floating buddy!');
  };

  const handleStopService = () => {
    onToggleService(false);
    showToast('Floating Buddy dismissed.');
  };

  const getMood = () => {
    if (stats.hunger > 70) return { label: 'HAPPY', color: 'text-emerald-400', bar: 'bg-emerald-500' };
    if (stats.hunger >= 30) return { label: 'NEUTRAL', color: 'text-amber-400', bar: 'bg-amber-500' };
    return { label: 'SAD', color: 'text-indigo-400', bar: 'bg-indigo-500' };
  };

  const moodInfo = getMood();

  return (
    <div className="bg-slate-900 text-slate-100 min-h-full p-4 overflow-y-auto font-sans relative">
      {/* Toast Notification Simulation */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-800/95 text-white border border-slate-700 px-4 py-2.5 rounded-full text-xs shadow-2xl backdrop-blur-md flex items-center gap-2 max-w-[90%] animate-in fade-in slide-in-from-bottom-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Header bar matching Compose Material 3 */}
      <div className="flex items-center justify-center gap-3 pt-2 pb-5">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center shadow-md shadow-emerald-500/20 text-xl">
          🟢
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
            Floating Buddy AI
            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Jetpack Compose
            </span>
          </h1>
          <p className="text-xs text-slate-400">Slime Companion & Screen Assistant</p>
        </div>
      </div>

      <div className="space-y-4 max-w-md mx-auto pb-8">
        {/* Section 1: OpenRouter API Configuration */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider">
              1. OpenRouter AI Configuration
            </span>
            <span className="text-[10px] bg-sky-950 text-sky-300 px-1.5 py-0.5 rounded border border-sky-800/50">
              gemini-flash-1.5
            </span>
          </div>
          <p className="text-[11px] text-slate-300 mb-3 leading-relaxed">
            Powers cute chat and screen vision. Saved securely to SharedPreferences <code className="text-sky-300">"openrouter_api_key"</code>.
          </p>

          <div className="relative mb-3">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full bg-slate-900/90 border border-slate-700 focus:border-sky-400 rounded-xl pl-9 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSaveKey}
              className="bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-medium py-2 px-3 rounded-xl transition-all shadow flex items-center justify-center gap-1.5"
            >
              {isSaved ? <Check className="w-3.5 h-3.5" /> : null}
              {isSaved ? 'Saved!' : 'Save Key'}
            </button>

            <button
              onClick={handleTestApi}
              disabled={isTestingApi}
              className="border border-slate-600 hover:border-slate-500 bg-slate-700/50 active:scale-95 text-white text-xs font-medium py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isTestingApi ? <span className="animate-spin text-xs">🌀</span> : null}
              {isTestingApi ? 'Pinging...' : 'Test API ("hi")'}
            </button>
          </div>
        </div>

        {/* Section 2: Slime Stats & Mood */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              2. Slime Stats & Mood
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-300">Mood:</span>
              <span className={`text-xs font-bold ${moodInfo.color}`}>{moodInfo.label}</span>
            </div>
          </div>

          <div className="space-y-3">
            {/* Hunger */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Hunger</span>
                <span className="text-red-400 font-bold">{stats.hunger}%</span>
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-red-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${stats.hunger}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400">Drops 1 point every 5 minutes in background</span>
            </div>

            {/* Happiness */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Happiness</span>
                <span className="text-amber-400 font-bold">{stats.happiness}%</span>
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${stats.happiness}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400">Drops faster if hunger drops below 30%</span>
            </div>

            {/* Energy */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Energy</span>
                <span className="text-sky-400 font-bold">{stats.energy}%</span>
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${stats.energy}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400">Consumed when playing with slime</span>
            </div>
          </div>

          {/* Quick Care Buttons */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-700/60">
            <button
              onClick={() => {
                onUpdateStats({
                  ...stats,
                  hunger: Math.min(100, stats.hunger + 20),
                  happiness: Math.min(100, stats.happiness + 10),
                  lastFed: Date.now()
                });
                showToast('Fed slime! (+20 hunger)');
              }}
              className="bg-slate-700/70 hover:bg-slate-700 text-xs py-1.5 px-2 rounded-lg border border-slate-600/80 transition-colors text-center"
            >
              🍎 Feed
            </button>
            <button
              onClick={() => {
                onUpdateStats({
                  ...stats,
                  happiness: Math.min(100, stats.happiness + 15),
                  energy: Math.max(0, stats.energy - 10)
                });
                showToast('Played with slime! (+15 happiness)');
              }}
              className="bg-slate-700/70 hover:bg-slate-700 text-xs py-1.5 px-2 rounded-lg border border-slate-600/80 transition-colors text-center"
            >
              🎾 Play
            </button>
            <button
              onClick={() => {
                onUpdateStats({
                  ...stats,
                  energy: Math.min(100, stats.energy + 20)
                });
                showToast('Slime took a nap! (+20 energy)');
              }}
              className="bg-slate-700/70 hover:bg-slate-700 text-xs py-1.5 px-2 rounded-lg border border-slate-600/80 transition-colors text-center"
            >
              💤 Rest
            </button>
          </div>
        </div>

        {/* Section 3 & 4: Overlay Controls & Service */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              3. Service & Permissions
            </span>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                isServiceRunning
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-slate-700 text-slate-400'
              }`}
            >
              {isServiceRunning ? '● Overlay Running' : '○ Stopped'}
            </span>
          </div>

          {/* Permissions status indicators */}
          <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  hasOverlayPermission ? 'bg-emerald-400' : 'bg-red-400'
                }`}
              />
              <span className="text-slate-300">Overlay Window</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full ${
                  hasMediaPermission ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span className="text-slate-300">Screen Projection</span>
            </div>
          </div>

          <div className="space-y-2">
            {!isServiceRunning ? (
              <button
                onClick={handleStartService}
                className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Start Floating Buddy
              </button>
            ) : (
              <button
                onClick={handleStopService}
                className="w-full bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-lg shadow-red-900/30 transition-all flex items-center justify-center gap-2"
              >
                <Square className="w-4 h-4 fill-current" />
                Stop Floating Buddy
              </button>
            )}
          </div>

          {/* Gestures Guide */}
          <div className="pt-2 border-t border-slate-700/60 text-xs">
            <p className="text-[11px] font-semibold text-slate-200 mb-1.5">Floating Gestures:</p>
            <div className="space-y-1 text-[11px] text-slate-300">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">👆 Single Tap:</span>
                <span className="text-sky-300">Ask AI with current stats</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">✌️ Double Tap:</span>
                <span className="text-emerald-300">Screen capture & vision AI</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">⏱️ Long Press (500ms):</span>
                <span className="text-amber-300">Open Quick Care feed menu</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-400">🖐️ Drag Slime:</span>
                <span className="text-purple-300">Move anywhere on screen</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
