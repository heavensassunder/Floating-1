import React, { useEffect, useState } from 'react';
import { SlimeStatsData } from './types';
import { PhoneSimulator } from './components/PhoneSimulator';
import { CodeExplorer } from './components/CodeExplorer';
import { PermissionsModal } from './components/PermissionsModal';
import {
  Smartphone,
  Code2,
  BookOpen,
  Download,
  Sparkles,
  Zap,
  ExternalLink,
  ShieldCheck,
  Heart,
  Bot
} from 'lucide-react';
import JSZip from 'jszip';
import { ANDROID_CODEBASE } from './data/androidCodebase';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'guide'>('simulator');

  // Slime Stats state (replicates SlimeStats.kt)
  const [stats, setStats] = useState<SlimeStatsData>(() => {
    try {
      const saved = localStorage.getItem('slime_stats');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      hunger: 92,
      happiness: 88,
      energy: 95,
      lastFed: Date.now()
    };
  });

  // Service running state
  const [isServiceRunning, setIsServiceRunning] = useState(true);

  // Permissions state
  const [hasOverlayPermission, setHasOverlayPermission] = useState(true);
  const [hasMediaPermission, setHasMediaPermission] = useState(true);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);

  // Background ticker: hunger drops every 5 minutes (or simulated tick)
  useEffect(() => {
    localStorage.setItem('slime_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) => {
        const nextHunger = Math.max(0, prev.hunger - 1);
        let nextHappiness = prev.happiness;
        if (nextHunger < 30) {
          nextHappiness = Math.max(0, prev.happiness - 2);
        }
        return {
          ...prev,
          hunger: nextHunger,
          happiness: nextHappiness
        };
      });
    }, 60000); // tick every minute
    return () => clearInterval(interval);
  }, []);

  const handleDownloadZip = async () => {
    try {
      const zip = new JSZip();
      ANDROID_CODEBASE.forEach((file) => {
        zip.file(file.path, file.content);
      });
      zip.file(
        'app/src/main/res/values/strings.xml',
        `<resources>
    <string name="app_name">Floating Buddy AI</string>
    <string name="service_name">Floating Slime Buddy Service</string>
</resources>`
      );
      zip.file(
        'app/src/main/res/values/colors.xml',
        `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="slime_green">#4ADE80</color>
    <color name="slime_dark_green">#15803D</color>
    <color name="white">#FFFFFFFF</color>
</resources>`
      );
      zip.file(
        'app/src/main/res/values/themes.xml',
        `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.FloatingBuddyAI" parent="android:Theme.Material.Light.NoActionBar">
        <item name="android:statusBarColor">#0F172A</item>
        <item name="android:navigationBarColor">#0F172A</item>
    </style>
</resources>`
      );
      zip.file(
        'README.md',
        `# Floating Buddy AI (Android Project)

1. Open Android Studio -> Open -> select this directory
2. Let Gradle sync dependencies
3. Run on physical device or emulator (Android 8.0+)
4. Set OpenRouter API Key and tap "Start Floating Buddy"`
      );
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'FloatingBuddyAI-Android-Project.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-green-400 flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20 animate-pulse">
              🟢
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white tracking-tight">
                  Floating Buddy AI
                </span>
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Native Android + Kotlin
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Slime Overlay Companion with OpenRouter AI (Gemini Flash 1.5) & Vision
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center bg-slate-800/90 p-1 rounded-2xl border border-slate-700/80">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'simulator'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Live Phone Simulator</span>
            </button>

            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'code'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Kotlin & Compose Code</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'guide'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Architecture & Setup</span>
            </button>
          </div>

          {/* Download Action */}
          <button
            onClick={handleDownloadZip}
            className="hidden md:flex items-center gap-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs font-semibold px-3 py-2 rounded-xl border border-slate-700 transition-all shadow"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Download Android Project (.ZIP)</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* TAB 1: Live Phone Simulator */}
        {activeTab === 'simulator' && (
          <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6">
            <div className="text-center max-w-lg mb-3">
              <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-0.5 rounded-full inline-block mb-1">
                Interactive Companion Overlay
              </span>
              <p className="text-xs text-slate-300">
                Drag the Slime anywhere! <strong>Single tap</strong> to chat,{' '}
                <strong>Double tap</strong> for screen vision, or <strong>Hold 500ms</strong> to feed.
              </p>
            </div>

            <PhoneSimulator
              stats={stats}
              onUpdateStats={setStats}
              isServiceRunning={isServiceRunning}
              onToggleService={setIsServiceRunning}
              hasOverlayPermission={hasOverlayPermission}
              hasMediaPermission={hasMediaPermission}
              onRequestPermissions={() => setIsPermissionsModalOpen(true)}
            />
          </div>
        )}

        {/* TAB 2: Android Codebase Explorer */}
        {activeTab === 'code' && <CodeExplorer />}

        {/* TAB 3: Architecture & Android Studio Run Guide */}
        {activeTab === 'guide' && (
          <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/80 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Floating Buddy AI Architecture</h2>
                  <p className="text-xs text-slate-400">
                    Native Android overlay architecture with Jetpack Compose & OpenRouter AI
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/60 space-y-1.5">
                  <h3 className="text-sm font-semibold text-sky-400 flex items-center gap-2">
                    <span>1. OpenRouterClient.kt</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    OkHttp3 client targeting <code className="text-sky-300">https://openrouter.ai/api/v1/chat/completions</code> with
                    model <code className="text-sky-300">google/gemini-flash-1.5</code>. Reads API key from SharedPreferences and constructs
                    standard text and vision payloads.
                  </p>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/60 space-y-1.5">
                  <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                    <span>2. SlimeStats.kt</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Tracks Hunger, Happiness, and Energy. Decays 1 point every 5 minutes in background.
                    Mood shifts between HAPPY (&gt;70), NEUTRAL (30-70), and SAD (&lt;30).
                  </p>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/60 space-y-1.5">
                  <h3 className="text-sm font-semibold text-purple-400 flex items-center gap-2">
                    <span>3. ChatBubbleView.kt</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Independent <code className="text-purple-300">TYPE_APPLICATION_OVERLAY</code> speech bubble rendered directly above the
                    floating avatar. Automatically dismisses after 5 seconds with alpha fade.
                  </p>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/60 space-y-1.5">
                  <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                    <span>4. ScreenshotHelper.kt</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Uses Android <code className="text-amber-300">MediaProjection</code> and <code className="text-amber-300">ImageReader</code> to
                    capture the frame buffer, remove row padding, and compress into Base64 for the vision prompt.
                  </p>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/60 space-y-1.5">
                  <h3 className="text-sm font-semibold text-rose-400 flex items-center gap-2">
                    <span>5. FloatingService.kt</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Foreground service drawing the custom canvas slime. Detects gestures (Single tap chat,
                    Double tap screenshot vision, Long press 500ms care menu, and drag to move).
                  </p>
                </div>

                <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/60 space-y-1.5">
                  <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                    <span>6. MainActivity.kt (Compose)</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    Material 3 control center. Handles overlay and media projection runtime permission
                    requests, stores OpenRouter API key, and displays live stat progress bars.
                  </p>
                </div>
              </div>
            </div>

            {/* Step by step Android Studio run instructions */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>How to Open & Run in Android Studio</span>
              </h3>

              <ol className="space-y-3 text-xs text-slate-300">
                <li className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-slate-700">
                    1
                  </span>
                  <div>
                    <strong className="text-white">Download or extract the project:</strong>
                    <p className="text-slate-400 mt-0.5">
                      Click the "Download Android Project (.ZIP)" button to get the pre-packaged bundle, or
                      navigate to the <code className="text-sky-300">android/</code> directory in this repo.
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-slate-700">
                    2
                  </span>
                  <div>
                    <strong className="text-white">Open in Android Studio:</strong>
                    <p className="text-slate-400 mt-0.5">
                      Select <em>File &gt; Open...</em> and select the project root. Android Studio will
                      sync Gradle dependencies (OkHttp3, Gson, Coroutines, DataStore, Jetpack Compose).
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-slate-700">
                    3
                  </span>
                  <div>
                    <strong className="text-white">Launch on Device or Emulator:</strong>
                    <p className="text-slate-400 mt-0.5">
                      Ensure target device is running Android 8.0 (API 26) or newer. Press <em>Run (Shift + F10)</em>.
                    </p>
                  </div>
                </li>

                <li className="flex gap-3">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-slate-700">
                    4
                  </span>
                  <div>
                    <strong className="text-white">Grant Overlay & Screen Recording:</strong>
                    <p className="text-slate-400 mt-0.5">
                      When prompted, enable "Display over other apps" in Android Settings and accept the
                      MediaProjection capture dialogue.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        )}
      </main>

      {/* Permissions Modal Simulator */}
      <PermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        hasOverlayPermission={hasOverlayPermission}
        hasMediaPermission={hasMediaPermission}
        onGrantOverlay={() => setHasOverlayPermission(true)}
        onGrantMedia={() => setHasMediaPermission(true)}
        onStartService={() => setIsServiceRunning(true)}
      />
    </div>
  );
}
