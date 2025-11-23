import React, { useState, useRef, useEffect } from 'react';
import { LyricLine, VisualSettings, ThemeStyle, AnimationType } from './types';
import { parseSRT } from './utils/srtParser';
import { analyzeLyricsForTheme } from './services/geminiService';
import Visualizer from './components/Visualizer';
import Controls from './components/Controls';

const DEFAULT_SETTINGS: VisualSettings = {
  primaryColor: '#6366f1',
  secondaryColor: '#c084fc',
  backgroundColor: '#0f172a',
  fontFamily: 'Montserrat',
  fontSize: 60,
  particleCount: 50,
  beatSensitivity: 1.0,
  style: ThemeStyle.NEON,
  animationType: AnimationType.SLIDE_UP,
  animationSpeed: 1.0,
};

const SAMPLE_LYRICS: LyricLine[] = [
  { id: '1', startTime: 0, endTime: 4, text: "歡迎來到 LyricalFlow" },
  { id: '2', startTime: 4.1, endTime: 8, text: "放下你的節奏，載入你的文字" },
  { id: '3', startTime: 8.1, endTime: 12, text: "觀看魔法展現" },
];

export default function App() {
  const [lyrics, setLyrics] = useState<LyricLine[]>(SAMPLE_LYRICS);
  const [settings, setSettings] = useState<VisualSettings>(DEFAULT_SETTINGS);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const srtInputRef = useRef<HTMLInputElement>(null);

  // Audio Event Listeners
  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const onPlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioSrc(url);
      setIsPlaying(false);
      // Reset time
      if(audioRef.current) audioRef.current.currentTime = 0;
    }
  };

  const handleSRTUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          const parsed = parseSRT(evt.target.result as string);
          if (parsed.length > 0) {
            setLyrics(parsed);
          } else {
            alert("無法解析 SRT 檔案。");
          }
        }
      };
      reader.readAsText(file);
    }
  };

  const handleAutoTheme = async () => {
    if (lyrics.length === 0) return;
    setIsGeneratingTheme(true);
    
    // Combine first 20 lines to analyze
    const textSample = lyrics.slice(0, 20).map(l => l.text).join('\n');
    const newSettings = await analyzeLyricsForTheme(textSample);
    
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
    setIsGeneratingTheme(false);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-brand-900 overflow-hidden font-sans">
      {/* Header */}
      <header className="h-16 border-b border-brand-800 flex items-center justify-between px-6 bg-brand-900/50 backdrop-blur z-10">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded bg-gradient-to-br from-brand-500 to-neon-purple flex items-center justify-center font-bold text-white">
             LF
           </div>
           <h1 className="text-xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
             LyricalFlow
           </h1>
        </div>
        <div className="flex items-center gap-4">
           <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">文件</a>
           <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">關於</a>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left: Visualization Area */}
        <div className="flex-1 p-6 flex flex-col items-center justify-center relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-800 via-brand-900 to-black">
          
          <div className="w-full max-w-5xl aspect-video mb-6 relative z-10">
             <Visualizer 
               lyrics={lyrics}
               currentTime={currentTime}
               isPlaying={isPlaying}
               audioRef={audioRef}
               settings={settings}
               onExportProgress={() => {}}
             />
          </div>

          {/* Player Controls (Bottom of Vis area) */}
          <div className="w-full max-w-5xl bg-brand-800/80 backdrop-blur rounded-xl p-4 border border-white/10 flex items-center gap-4 z-10">
             <button 
               onClick={onPlayPause}
               className="w-12 h-12 rounded-full bg-white text-brand-900 flex items-center justify-center hover:scale-105 transition-transform"
             >
                {isPlaying ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                ) : (
                  <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
             </button>
             
             <div className="flex-1">
                <input 
                  type="range" 
                  min="0" 
                  max={duration || 100} 
                  value={currentTime}
                  onChange={(e) => {
                    if(audioRef.current) audioRef.current.currentTime = Number(e.target.value);
                  }}
                  className="w-full accent-brand-500 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                   <span>{Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')}</span>
                   <span>{Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}</span>
                </div>
             </div>

             <div className="flex gap-2">
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 accept="audio/*" 
                 className="hidden" 
                 onChange={handleAudioUpload}
               />
               <button 
                 onClick={() => fileInputRef.current?.click()}
                 className="px-3 py-2 text-xs font-medium bg-gray-700 hover:bg-gray-600 rounded text-white whitespace-nowrap"
               >
                 上傳音訊
               </button>

               <input 
                 type="file" 
                 ref={srtInputRef} 
                 accept=".srt" 
                 className="hidden" 
                 onChange={handleSRTUpload}
               />
               <button 
                 onClick={() => srtInputRef.current?.click()}
                 className="px-3 py-2 text-xs font-medium bg-gray-700 hover:bg-gray-600 rounded text-white whitespace-nowrap"
               >
                 匯入 SRT
               </button>
             </div>
          </div>

          <audio 
            ref={audioRef}
            src={audioSrc || undefined}
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />

        </div>

        {/* Right: Controls Sidebar */}
        <Controls 
          settings={settings} 
          updateSettings={(newS) => setSettings(prev => ({...prev, ...newS}))} 
          onAutoTheme={handleAutoTheme}
          isGeneratingTheme={isGeneratingTheme}
        />
        
      </div>
    </div>
  );
}