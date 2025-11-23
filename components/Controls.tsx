import React from 'react';
import { VisualSettings, ThemeStyle, AnimationType } from '../types';

interface ControlsProps {
  settings: VisualSettings;
  updateSettings: (newSettings: Partial<VisualSettings>) => void;
  onAutoTheme: () => void;
  isGeneratingTheme: boolean;
}

const FONTS = [
  { name: 'Montserrat', label: 'Montserrat (現代)' },
  { name: 'Inter', label: 'Inter (簡約)' },
  { name: 'Times New Roman', label: 'Serif (經典)' },
  { name: 'Courier New', label: 'Mono (代碼)' },
];

const ANIMATION_LABELS: Record<AnimationType, string> = {
  [AnimationType.FADE]: '淡入 (Fade)',
  [AnimationType.SLIDE_UP]: '上滑 (Slide Up)',
  [AnimationType.ZOOM]: '縮放 (Zoom)',
  [AnimationType.BOUNCE]: '彈跳 (Bounce)',
};

const THEME_LABELS: Record<ThemeStyle, string> = {
  [ThemeStyle.NEON]: '霓虹 (Neon)',
  [ThemeStyle.MINIMAL]: '極簡 (Minimal)',
  [ThemeStyle.NATURE]: '自然 (Nature)',
  [ThemeStyle.FIERY]: '熾熱 (Fiery)',
};

const Controls: React.FC<ControlsProps> = ({ settings, updateSettings, onAutoTheme, isGeneratingTheme }) => {
  return (
    <div className="bg-brand-900 border-l border-brand-800 p-6 h-full overflow-y-auto w-full md:w-80 flex-shrink-0">
      <h2 className="text-xl font-display font-bold text-white mb-6">工作室控制</h2>

      <div className="space-y-6">
        
        {/* AI Theme Gen */}
        <div className="p-4 bg-brand-800 rounded-lg border border-brand-500/30">
          <h3 className="text-sm font-semibold text-brand-400 mb-2 flex items-center gap-2">
            ✨ AI 魔法
          </h3>
          <p className="text-xs text-gray-400 mb-3">分析歌詞以自動生成配色與風格。</p>
          <button 
            onClick={onAutoTheme}
            disabled={isGeneratingTheme}
            className="w-full py-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-md text-sm font-medium transition-colors"
          >
            {isGeneratingTheme ? '正在分析...' : '自動生成主題'}
          </button>
        </div>

        {/* Style Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">視覺風格</label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(ThemeStyle).map((style) => (
              <button
                key={style}
                onClick={() => updateSettings({ style })}
                className={`py-2 px-2 text-xs rounded border transition-all truncate ${
                  settings.style === style 
                    ? 'bg-brand-500 border-brand-500 text-white' 
                    : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500'
                }`}
              >
                {THEME_LABELS[style]}
              </button>
            ))}
          </div>
        </div>

        {/* Animation Selection - NEW */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">文字動畫</label>
          <div className="space-y-3">
             <select
               value={settings.animationType}
               onChange={(e) => updateSettings({ animationType: e.target.value as AnimationType })}
               className="w-full bg-brand-800 text-white text-sm rounded-md border border-gray-700 p-2 focus:ring-1 focus:ring-brand-500 outline-none"
             >
               {Object.values(AnimationType).map(type => (
                 <option key={type} value={type}>{ANIMATION_LABELS[type]}</option>
               ))}
             </select>
             
             <div>
                <span className="text-xs text-gray-500 block mb-1">動畫速度 ({settings.animationSpeed}x)</span>
                <input 
                  type="range" 
                  min="0.1" 
                  max="3.0" 
                  step="0.1"
                  value={settings.animationSpeed}
                  onChange={(e) => updateSettings({ animationSpeed: Number(e.target.value) })}
                  className="w-full accent-brand-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
             </div>
          </div>
        </div>

        {/* Colors */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">配色</label>
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">主色</span>
              <input 
                type="color" 
                value={settings.primaryColor}
                onChange={(e) => updateSettings({ primaryColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">次色</span>
              <input 
                type="color" 
                value={settings.secondaryColor}
                onChange={(e) => updateSettings({ secondaryColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">背景色</span>
              <input 
                type="color" 
                value={settings.backgroundColor}
                onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
              />
            </div>
          </div>
        </div>

        {/* Typography */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">字體排版</label>
          <div className="space-y-3">
             <select
               value={settings.fontFamily}
               onChange={(e) => updateSettings({ fontFamily: e.target.value })}
               className="w-full bg-brand-800 text-white text-sm rounded-md border border-gray-700 p-2 focus:ring-1 focus:ring-brand-500 outline-none"
             >
               {FONTS.map(font => (
                 <option key={font.name} value={font.name}>{font.label}</option>
               ))}
             </select>

             <div>
                <span className="text-xs text-gray-500 block mb-1">字體大小 ({settings.fontSize}px)</span>
                <input 
                  type="range" 
                  min="20" 
                  max="120" 
                  value={settings.fontSize}
                  onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                  className="w-full accent-brand-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
             </div>
          </div>
        </div>

        {/* Particles / Beat */}
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">特效</label>
          <div className="space-y-4">
             <div>
                <span className="text-xs text-gray-500 block mb-1">粒子數量</span>
                <input 
                  type="range" 
                  min="0" 
                  max="200" 
                  value={settings.particleCount}
                  onChange={(e) => updateSettings({ particleCount: Number(e.target.value) })}
                  className="w-full accent-neon-pink h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
             </div>
             <div>
                <span className="text-xs text-gray-500 block mb-1">節奏靈敏度</span>
                <input 
                  type="range" 
                  min="0" 
                  max="2" 
                  step="0.1"
                  value={settings.beatSensitivity}
                  onChange={(e) => updateSettings({ beatSensitivity: Number(e.target.value) })}
                  className="w-full accent-neon-cyan h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
             </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Controls;