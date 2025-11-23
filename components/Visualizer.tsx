import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LyricLine, VisualSettings, ThemeStyle, AnimationType } from '../types';

interface VisualizerProps {
  lyrics: LyricLine[];
  currentTime: number;
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
  settings: VisualSettings;
  onExportProgress: (isExporting: boolean) => void;
}

// Easing functions
const easeOutCubic = (x: number): number => 1 - Math.pow(1 - x, 3);
const easeOutElastic = (x: number): number => {
  const c4 = (2 * Math.PI) / 3;
  return x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
};

// Particle Class for Visuals
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;

  constructor(w: number, h: number, color: string) {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.vx = (Math.random() - 0.5) * 1;
    this.vy = (Math.random() - 0.5) * 1;
    this.size = Math.random() * 3 + 1;
    this.color = color;
    this.life = 0;
    this.maxLife = Math.random() * 100 + 100;
  }

  update(width: number, height: number, beatFactor: number) {
    this.x += this.vx * beatFactor;
    this.y += this.vy * beatFactor;
    this.life++;

    if (this.x < 0 || this.x > width) this.vx *= -1;
    if (this.y < 0 || this.y > height) this.vy *= -1;
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = 1 - this.life / this.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

const Visualizer: React.FC<VisualizerProps> = ({
  lyrics,
  currentTime,
  isPlaying,
  audioRef,
  settings,
  onExportProgress
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const requestRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  
  // Recording State
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);

  // Initialize Audio Context (once user interacts)
  const initAudio = useCallback(() => {
    if (!audioRef.current || audioContextRef.current) return;

    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    
    // Connect audio element source
    const source = ctx.createMediaElementSource(audioRef.current);
    source.connect(analyser);
    analyser.connect(ctx.destination);

    audioContextRef.current = ctx;
    analyserRef.current = analyser;
    sourceRef.current = source;
  }, [audioRef]);

  // Handle Resize
  useEffect(() => {
    const resize = () => {
      if (containerRef.current && canvasRef.current) {
        // Force 16:9 aspect ratio
        const width = containerRef.current.clientWidth;
        const height = width * (9 / 16);
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        
        // Reset particles on resize
        particlesRef.current = [];
      }
    };
    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Main Render Loop
  const animate = useCallback(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    // Get Audio Data
    let beatFactor = 1.0;
    if (analyserRef.current) {
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average low-mid freq for "beat"
      let sum = 0;
      for (let i = 0; i < 20; i++) sum += dataArray[i];
      const average = sum / 20;
      beatFactor = 1 + (average / 255) * settings.beatSensitivity;
    }

    // Clear & Background
    ctx.fillStyle = settings.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Draw Particles
    if (particlesRef.current.length < settings.particleCount) {
      particlesRef.current.push(new Particle(width, height, Math.random() > 0.5 ? settings.primaryColor : settings.secondaryColor));
    }

    particlesRef.current.forEach((p, index) => {
      p.update(width, height, beatFactor);
      p.draw(ctx);
      if (p.life >= p.maxLife) {
        particlesRef.current.splice(index, 1);
      }
    });

    // Draw Visualizer Bar (Bottom)
    if (analyserRef.current) {
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const barWidth = (width / bufferLength) * 2.5;
      let barX = 0;

      for(let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * (height / 3) * beatFactor;
        
        ctx.fillStyle = settings.secondaryColor;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(barX, height - barHeight, barWidth, barHeight);
        ctx.globalAlpha = 1.0;
        
        barX += barWidth + 1;
      }
    }

    // Draw Text
    // Find active lyric
    const activeLineIndex = lyrics.findIndex(
      l => currentTime >= l.startTime && currentTime <= l.endTime
    );
    const activeLine = activeLineIndex !== -1 ? lyrics[activeLineIndex] : null;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Previous Line (Faded)
    if (activeLineIndex > 0) {
       ctx.font = `600 ${settings.fontSize * 0.6}px ${settings.fontFamily}`;
       ctx.fillStyle = '#ffffff';
       ctx.globalAlpha = 0.3;
       ctx.fillText(lyrics[activeLineIndex - 1].text, width / 2, height / 2 - settings.fontSize * 1.5);
    }

    // Active Line (With Animation)
    if (activeLine) {
      // Calculate animation progress
      const progress = currentTime - activeLine.startTime;
      // Default duration is 0.5s, modulated by speed setting (higher speed = lower duration)
      const animationDuration = 0.5 / settings.animationSpeed;
      const t = Math.min(1, Math.max(0, progress / animationDuration));

      let scale = 1 + (beatFactor - 1) * 0.2; // Base beat pulse
      let alpha = 1.0;
      let yOffset = 0;

      // Apply specific animation logic
      switch (settings.animationType) {
        case AnimationType.FADE:
          alpha = t;
          break;
        case AnimationType.SLIDE_UP:
          alpha = t;
          yOffset = 50 * (1 - easeOutCubic(t));
          break;
        case AnimationType.ZOOM:
          scale *= t;
          alpha = t;
          break;
        case AnimationType.BOUNCE:
          scale *= easeOutElastic(t);
          alpha = Math.min(1, t * 2); // Fade in quickly
          break;
        default:
          alpha = 1;
          break;
      }

      ctx.globalAlpha = alpha;
      ctx.save();
      ctx.translate(width / 2, height / 2 + yOffset);
      ctx.scale(scale, scale);
      
      ctx.font = `900 ${settings.fontSize}px ${settings.fontFamily}`;
      
      // Glow effect based on style
      if (settings.style === ThemeStyle.NEON) {
        ctx.shadowColor = settings.primaryColor;
        ctx.shadowBlur = 20 * beatFactor;
      } else if (settings.style === ThemeStyle.FIERY) {
        ctx.shadowColor = '#ff4500';
        ctx.shadowBlur = 15 * beatFactor;
      } else {
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillText(activeLine.text, 0, 0);
      
      // Stroke
      ctx.strokeStyle = settings.primaryColor;
      ctx.lineWidth = 2;
      ctx.strokeText(activeLine.text, 0, 0);
      
      ctx.restore();
    } else {
        // Optional: Show song title or waiting state
    }

    requestRef.current = requestAnimationFrame(animate);
  }, [currentTime, lyrics, settings]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  // Setup Audio Context on first interaction
  useEffect(() => {
    if (isPlaying) {
      initAudio();
      audioContextRef.current?.resume();
    }
  }, [isPlaying, initAudio]);

  // Export Logic
  const startRecording = () => {
    if (!canvasRef.current || !audioRef.current) return;

    // We need to capture the canvas stream and the audio stream and merge them
    const canvasStream = canvasRef.current.captureStream(60); // 60 FPS
    
    // For audio, we need to tap into the destination again or create a specialized destination
    // Since we already connected source -> analyser -> destination, we can't easily hijack 'destination'
    // But we can connect source -> mediaStreamDestination as well.
    const dest = audioContextRef.current!.createMediaStreamDestination();
    sourceRef.current!.connect(dest);
    
    const audioTrack = dest.stream.getAudioTracks()[0];
    canvasStream.addTrack(audioTrack);

    const recorder = new MediaRecorder(canvasStream, {
      mimeType: 'video/webm;codecs=vp9'
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      chunksRef.current = [];
      
      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'lyrical-flow-export.webm';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      setRecording(false);
      onExportProgress(false);
    };

    mediaRecorderRef.current = recorder;
    recorder.start();
    setRecording(true);
    onExportProgress(true);
    
    // Play audio from start to record properly? 
    // For now, let's just record what user plays.
    audioRef.current.currentTime = 0;
    audioRef.current.play();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      audioRef.current?.pause();
    }
  };

  React.useImperativeHandle(React.forwardRef(() => {}), () => ({
      // Exposed methods if needed
  }));

  return (
    <div className="flex flex-col gap-4 w-full h-full">
      <div 
        ref={containerRef} 
        className="w-full relative shadow-2xl rounded-xl overflow-hidden border-2 border-brand-800 bg-black aspect-video"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
        
        {/* Overlay Recording Status */}
        {recording && (
           <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600/80 px-3 py-1 rounded-full animate-pulse">
             <div className="w-3 h-3 bg-white rounded-full"></div>
             <span className="text-xs font-bold text-white">REC</span>
           </div>
        )}
      </div>

      <div className="flex justify-between items-center bg-brand-800 p-4 rounded-xl border border-brand-800">
        <div className="text-sm text-gray-400">
            {recording ? "錄製中... 按停止以儲存" : "預覽模式"}
        </div>
        {!recording ? (
             <button 
             onClick={startRecording}
             className="px-6 py-2 bg-gradient-to-r from-brand-500 to-neon-purple rounded-lg text-white font-bold hover:opacity-90 transition-all flex items-center gap-2"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
             </svg>
             開始錄製並匯出
           </button>
        ) : (
            <button 
            onClick={stopRecording}
            className="px-6 py-2 bg-red-500 rounded-lg text-white font-bold hover:bg-red-600 transition-all"
          >
            停止錄製
          </button>
        )}
       
      </div>
    </div>
  );
};

export default Visualizer;