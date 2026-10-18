import React, { useState } from 'react';
import { ANDROID_CODEBASE } from '../data/androidCodebase';
import { CodeFile } from '../types';
import {
  FileCode,
  Copy,
  Check,
  Download,
  FolderTree,
  Terminal,
  ExternalLink,
  Sparkles,
  Info
} from 'lucide-react';
import JSZip from 'jszip';

export const CodeExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<CodeFile>(ANDROID_CODEBASE[0]);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();

      // Populate Android Studio project directory structure
      ANDROID_CODEBASE.forEach((file) => {
        zip.file(file.path, file.content);
      });

      // Add strings.xml and themes
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
    } catch (err) {
      console.error('Failed to generate ZIP:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-7xl mx-auto w-full overflow-hidden">
      {/* Left Sidebar: File Tree & Actions */}
      <div className="w-full lg:w-80 flex flex-col gap-3 shrink-0">
        {/* Export Button Card */}
        <div className="bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Download className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-white">Export Android Studio Project</h3>
          </div>
          <p className="text-xs text-slate-300 mb-3 leading-relaxed">
            Download the ready-to-build native Kotlin & Compose project bundle in one click (.ZIP).
          </p>
          <button
            onClick={handleDownloadZip}
            disabled={isExporting}
            className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold py-2.5 px-3 rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <span className="animate-spin text-xs">🌀</span> Packaging ZIP...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" /> Download Project (.ZIP)
              </>
            )}
          </button>
        </div>

        {/* Files Navigation List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-xl flex-1 flex flex-col min-h-[360px]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 px-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <FolderTree className="w-3.5 h-3.5 text-sky-400" />
              <span>Project Files ({ANDROID_CODEBASE.length})</span>
            </div>
            <span className="text-[10px] text-slate-400">Kotlin / Compose</span>
          </div>

          <div className="space-y-1 overflow-y-auto flex-1 pr-1">
            {ANDROID_CODEBASE.map((file) => {
              const isSelected = selectedFile.name === file.name;
              return (
                <button
                  key={file.name}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition-all flex items-center justify-between gap-2 group ${
                    isSelected
                      ? 'bg-sky-950/80 text-sky-300 border border-sky-600/40 shadow'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileCode
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-400'
                      }`}
                    />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider font-sans shrink-0 ${
                      file.category === 'Kotlin'
                        ? 'bg-purple-950 text-purple-300 border border-purple-800/50'
                        : file.category === 'Manifest'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800/50'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                    }`}
                  >
                    {file.category}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Area: Code Viewer */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl min-h-[500px]">
        {/* Code Header Bar */}
        <div className="bg-slate-950/90 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white font-mono">{selectedFile.name}</span>
              <span className="text-[10px] text-slate-400 font-mono bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                {selectedFile.path}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">{selectedFile.description}</p>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all active:scale-95 shadow"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        {/* Code Block with line numbering */}
        <div className="flex-1 overflow-auto bg-[#0A0F1D] p-4 text-xs font-mono text-slate-300">
          <div className="flex">
            {/* Line numbers */}
            <div className="select-none text-slate-600 text-right pr-4 border-r border-slate-800 mr-4 font-mono shrink-0">
              {selectedFile.content.split('\n').map((_, i) => (
                <div key={i} className="leading-6">
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Code content */}
            <pre className="flex-1 overflow-x-auto leading-6 whitespace-pre font-mono text-slate-200">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>

        {/* Footer info bar */}
        <div className="bg-slate-950 border-t border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Target SDK 34 • Kotlin 1.9.22 • Jetpack Compose BOM 2024.02.00</span>
          </div>
          <span className="font-mono">{selectedFile.content.split('\n').length} lines</span>
        </div>
      </div>
    </div>
  );
};
