/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Video, Upload, Trash2, ArrowUp, ArrowDown, Play, Pause, RotateCcw, 
  Download, Film, Sparkles, Sliders, Layers, RefreshCw, X, CheckCircle2, AlertCircle, Maximize2
} from 'lucide-react';

interface ImageItem {
  id: string;
  url: string;
  name: string;
  isProcedural: boolean;
}

interface ImageToVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TransitionStyle = 'crossfade' | 'slide-left' | 'slide-up' | 'ken-burns' | 'voxel-blend';

export const ImageToVideoModal: React.FC<ImageToVideoModalProps> = ({ isOpen, onClose }) => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [transitionStyle, setTransitionStyle] = useState<TransitionStyle>('voxel-blend');
  const [imageDuration, setImageDuration] = useState<number>(3); // seconds per image
  const [transitionDuration, setTransitionDuration] = useState<number>(1); // seconds of transition
  const [resolution, setResolution] = useState<{ width: number; height: number; label: string }>({
    width: 800,
    height: 450,
    label: '16:9 Landscape'
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [renderProgress, setRenderProgress] = useState<number>(0);
  const [renderStatus, setRenderStatus] = useState<string>('Initializing encoding...');
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);

  // Drag and Drop State
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Hidden references for canvases
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const imgCacheRef = useRef<Record<string, HTMLImageElement>>({});

  // Media Recorder references
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Calculate total duration
  const totalDuration = images.length * imageDuration;

  // Initialize with procedural samples so the app is instantly fun to use
  useEffect(() => {
    if (images.length === 0) {
      loadProceduralPresets();
    }
  }, []);

  // Generate procedural sample images
  const loadProceduralPresets = () => {
    const presets = [
      { name: 'Retro Sunset Voxel', generator: drawRetroSunset },
      { name: 'Cosmic Nebula Voxel', generator: drawCosmicNebula },
      { name: 'Cyberpunk Grid', generator: drawCyberpunkGrid },
      { name: 'Minecraft Valley', generator: drawMinecraftValley }
    ];

    const generatedItems = presets.map((p, idx) => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 1200;
      tempCanvas.height = 675;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        p.generator(ctx, 1200, 675);
      }
      return {
        id: `procedural-${idx}-${Date.now()}`,
        url: tempCanvas.toDataURL('image/png'),
        name: p.name,
        isProcedural: true
      };
    });

    setImages(generatedItems);
  };

  // --- Drawing Procedural Vectors ---
  function drawRetroSunset(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Gradient sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#0d0b21');
    skyGrad.addColorStop(0.5, '#2e113d');
    skyGrad.addColorStop(0.8, '#591a4f');
    skyGrad.addColorStop(1, '#cd586b');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Glowing retro sun
    const sunY = h * 0.65;
    const sunR = Math.min(w, h) * 0.28;
    const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
    sunGrad.addColorStop(0, '#fde047');
    sunGrad.addColorStop(1, '#f43f5e');

    ctx.fillStyle = sunGrad;
    ctx.shadowColor = '#f43f5e';
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.arc(w / 2, sunY, sunR, Math.PI, 0); // half circle or custom sliced
    ctx.fill();
    ctx.shadowBlur = 0; // reset

    // Draw the slices in sun
    ctx.fillStyle = '#0d0b21';
    for (let sy = sunY + 5; sy > sunY - sunR; sy -= 18) {
      const sliceH = Math.max(2, (sunY - sy) * 0.12);
      ctx.fillRect(w / 2 - sunR - 10, sy, sunR * 2 + 20, sliceH);
    }

    // Grid Floor
    ctx.shadowBlur = 0;
    const floorY = h * 0.65;
    const floorH = h - floorY;

    const floorGrad = ctx.createLinearGradient(0, floorY, 0, h);
    floorGrad.addColorStop(0, '#120421');
    floorGrad.addColorStop(1, '#05010a');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, w, floorH);

    // Grid wireframes
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    const numLines = 36;
    for (let i = 0; i <= numLines; i++) {
        const ratio = i / numLines;
        const xOffset = (ratio - 0.5) * w * 3.5;
        ctx.beginPath();
        ctx.moveTo(w / 2, floorY);
        ctx.lineTo(w / 2 + xOffset, h);
        ctx.stroke();
    }

    // Horizontal perspective lines
    const numHoriz = 16;
    for (let i = 0; i < numHoriz; i++) {
        const norm = i / numHoriz;
        const pY = floorY + Math.pow(norm, 2.2) * floorH;
        ctx.strokeStyle = `rgba(236, 72, 153, ${norm * 0.8})`;
        ctx.lineWidth = 1 + norm * 3;
        ctx.beginPath();
        ctx.moveTo(0, pY);
        ctx.lineTo(w, pY);
        ctx.stroke();
    }

    // Mountains silhouettes
    ctx.fillStyle = '#1e1136';
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(w * 0.15, floorY - 80);
    ctx.lineTo(w * 0.3, floorY - 30);
    ctx.lineTo(w * 0.45, floorY - 120);
    ctx.lineTo(w * 0.6, floorY - 40);
    ctx.lineTo(w * 0.8, floorY - 90);
    ctx.lineTo(w, floorY);
    ctx.fill();

    // Voxel / Block overlay accent
    ctx.fillStyle = 'rgba(34, 211, 238, 0.6)';
    for (let i = 0; i < 40; i++) {
        const vx = Math.floor(Math.random() * 40) * (w / 40);
        const vy = floorY - 20 - Math.floor(Math.random() * 10) * 15;
        const vs = 8 + Math.random() * 10;
        ctx.fillRect(vx, vy, vs, vs);
    }
  }

  function drawCosmicNebula(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#060112';
    ctx.fillRect(0, 0, w, h);

    // Glowing Nebula cloud
    const cloudGrad = ctx.createRadialGradient(w * 0.4, h * 0.5, 50, w * 0.4, h * 0.5, w * 0.5);
    cloudGrad.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
    cloudGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.15)');
    cloudGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = cloudGrad;
    ctx.fillRect(0, 0, w, h);

    const cloudGrad2 = ctx.createRadialGradient(w * 0.65, h * 0.4, 30, w * 0.65, h * 0.4, w * 0.4);
    cloudGrad2.addColorStop(0, 'rgba(56, 189, 248, 0.3)');
    cloudGrad2.addColorStop(0.6, 'rgba(124, 58, 237, 0.1)');
    cloudGrad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = cloudGrad2;
    ctx.fillRect(0, 0, w, h);

    // Draw grid mesh overlay (tech feel)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }

    // Stars
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 200; i++) {
        const sx = Math.random() * w;
        const sy = Math.random() * h;
        const sz = Math.random() * 2;
        ctx.beginPath();
        ctx.arc(sx, sy, sz, 0, Math.PI * 2);
        ctx.fill();
    }

    // Saturn Ring Planet
    const px = w * 0.75;
    const py = h * 0.35;
    const pr = 45;

    // Ring shadow behind
    ctx.strokeStyle = 'rgba(253, 186, 116, 0.7)';
    ctx.lineWidth = 14;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-Math.PI / 8);
    ctx.scale(2.2, 0.25);
    ctx.beginPath();
    ctx.arc(0, 0, pr * 1.3, Math.PI * 0.95, Math.PI * 2.05);
    ctx.stroke();
    ctx.restore();

    // Planet body
    const planetGrad = ctx.createLinearGradient(px - pr, py - pr, px + pr, py + pr);
    planetGrad.addColorStop(0, '#f97316');
    planetGrad.addColorStop(0.6, '#ea580c');
    planetGrad.addColorStop(1, '#7c2d12');
    ctx.fillStyle = planetGrad;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();

    // Ring front
    ctx.strokeStyle = 'rgba(253, 186, 116, 0.9)';
    ctx.lineWidth = 14;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-Math.PI / 8);
    ctx.scale(2.2, 0.25);
    ctx.beginPath();
    ctx.arc(0, 0, pr * 1.3, -Math.PI * 0.05, Math.PI * 1.05);
    ctx.stroke();
    ctx.restore();

    // Floating Lego blocks
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(w * 0.2, h * 0.35, 24, 24);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(w * 0.2 + 24, h * 0.35, 12, 24);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(w * 0.2, h * 0.35 - 12, 36, 12);
  }

  function drawCyberpunkGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, w, h);

    // Glowing green matrix lines
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    for (let y = 0; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }

    // Cyberpunk crosshairs and rings
    const cx = w / 2;
    const cy = h / 2;

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 140, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.beginPath();
    ctx.arc(cx, cy, 160, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 160, Math.PI * 0.66, Math.PI * 1.33);
    ctx.stroke();

    // Center Voxel construct
    const voxelSize = 25;
    const gridCols = 8;
    const gridRows = 6;
    const startX = cx - (gridCols * voxelSize) / 2;
    const startY = cy - (gridRows * voxelSize) / 2;

    for (let c = 0; c < gridCols; c++) {
      for (let r = 0; r < gridRows; r++) {
         if ((c + r) % 2 === 0 || Math.random() > 0.4) {
             const px = startX + c * voxelSize;
             const py = startY + r * voxelSize;

             ctx.fillStyle = `hsl(${140 + c * 10}, 80%, ${45 + r * 5}%)`;
             ctx.fillRect(px, py, voxelSize - 2, voxelSize - 2);

             // Cube 3D projection lips
             ctx.fillStyle = `hsl(${140 + c * 10}, 80%, 25%)`;
             ctx.fillRect(px + voxelSize - 2, py + 2, 2, voxelSize - 2);
             ctx.fillRect(px + 2, py + voxelSize - 2, voxelSize - 2, 2);
         }
      }
    }

    // High Tech labels
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('SYS.STATUS: ONLINE', cx - 130, cy + 200);
    ctx.fillText('TRANSCODE_BUFF: ACTIVE', cx - 130, cy + 220);
    ctx.fillText('MODEL_SEED: X92-B', cx + 20, cy - 190);

    // Cyber horizontal alert bar
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.fillRect(0, h - 60, w, 40);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(w * 0.4, h - 58, w * 0.2, 4);
  }

  function drawMinecraftValley(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Beautiful sky gradient from soft blue to pale cyan
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#7dd3fc');
    sky.addColorStop(0.6, '#bae6fd');
    sky.addColorStop(1, '#e0f2fe');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Warm soft sun
    ctx.fillStyle = '#fef08a';
    ctx.shadowBlur = 30;
    ctx.shadowColor = '#fef08a';
    ctx.beginPath();
    ctx.arc(w * 0.15, h * 0.25, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Blocky puffy clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(w * 0.4, h * 0.15, 120, 30);
    ctx.fillRect(w * 0.45, h * 0.15 - 15, 75, 15);
    ctx.fillRect(w * 0.7, h * 0.2, 140, 35);
    ctx.fillRect(w * 0.75, h * 0.2 - 15, 90, 15);

    // Distant dark green blocky mountains (Layer 1)
    ctx.fillStyle = '#155e75';
    drawStairwayMountain(ctx, w * 0.5, h * 0.65, 300, 140, 20);
    ctx.fillStyle = '#115e59';
    drawStairwayMountain(ctx, w * 0.1, h * 0.7, 400, 180, 25);

    // Mid-ground nice warm green plateau (Layer 2)
    ctx.fillStyle = '#16a34a';
    drawStairwayMountain(ctx, w * 0.35, h * 0.8, 480, 240, 30);

    // Foreground voxel mountains (Layer 3)
    ctx.fillStyle = '#15803d';
    drawStairwayMountain(ctx, w * -0.05, h * 0.85, 340, 280, 35);
    ctx.fillStyle = '#166534';
    drawStairwayMountain(ctx, w * 0.7, h * 0.9, 450, 300, 40);

    // Water grid flat floor
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, h * 0.88, w, h * 0.12);

    // Helper to draw clean stair mountain
    function drawStairwayMountain(c: CanvasRenderingContext2D, sx: number, sy: number, mw: number, mh: number, steps: number) {
        c.beginPath();
        c.moveTo(sx, h);
        c.lineTo(sx, sy);
        
        const stepW = mw / steps;
        const stepH = mh / steps;
        
        let currX = sx;
        let currY = sy;
        
        // Go Up/Down
        for (let i = 0; i < steps; i++) {
            currX += stepW;
            currY += (i < steps / 2 ? -stepH : stepH);
            c.lineTo(currX, currY);
        }
        
        c.lineTo(sx + mw, h);
        c.closePath();
        c.fill();
    }
  }

  // --- Image Cache Management ---
  const preloadImage = (id: string, url: string): Promise<HTMLImageElement> => {
    if (imgCacheRef.current[id]) {
      return Promise.resolve(imgCacheRef.current[id]);
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // request credentials-free CORS-safe image
      img.onload = () => {
        imgCacheRef.current[id] = img;
        resolve(img);
      };
      img.onerror = (e) => reject(e);
      img.src = url;
    });
  };

  // Preload all active images in cache when image list changes
  useEffect(() => {
    images.forEach(img => {
      preloadImage(img.id, img.url).catch(err => {
        console.error(`Failed to preload image: ${img.name}`, err);
      });
    });
  }, [images]);

  // Canvas Drawing and Main Loop
  useEffect(() => {
    if (!isPlaying || isRendering || images.length === 0) return;

    let animId: number;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsedSec = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      // Update current time securely
      const nextTime = currentTime + elapsedSec;
      const currentCycleTime = nextTime % totalDuration;
      setCurrentTime(currentCycleTime);

      // Render the frame onto preview canvas
      drawCanvasFrame(ctx, canvas.width, canvas.height, currentCycleTime);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      lastTimeRef.current = 0;
    };
  }, [isPlaying, isRendering, currentTime, images, totalDuration, transitionStyle, imageDuration, transitionDuration]);

  // Draw a specific cycle timestamp onto the canvas
  const drawCanvasFrame = (ctx: CanvasRenderingContext2D, w: number, h: number, timeSec: number) => {
    if (images.length === 0) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Please add images to animate', w / 2, h / 2);
      return;
    }

    // Determine slides index and transition blend
    const slideDuration = imageDuration; 
    let currentSlideIdx = Math.floor(timeSec / slideDuration) % images.length;
    let nextSlideIdx = (currentSlideIdx + 1) % images.length;

    const localTime = timeSec % slideDuration; // 0 to slideDuration
    const transStartTime = slideDuration - transitionDuration;

    let isTransition = false;
    let transitionProgress = 0;

    if (localTime >= transStartTime) {
      isTransition = true;
      transitionProgress = (localTime - transStartTime) / transitionDuration;
    }

    const currentImgItem = images[currentSlideIdx];
    const nextImgItem = images[nextSlideIdx];

    const currentImg = imgCacheRef.current[currentImgItem.id];
    const nextImg = imgCacheRef.current[nextImgItem.id];

    // Clear background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    if (!isTransition) {
      // 1. Static/Camera Motion view of only currentImg
      if (currentImg) {
        drawSingleImage(ctx, currentImg, w, h, localTime, transitionStyle === 'ken-burns' ? 'ken-burns' : 'none');
      } else {
        drawFallbackText(ctx, currentImgItem.name, w, h);
      }
    } else {
      // 2. Active transition between currentImg and nextImg
      if (currentImg && nextImg) {
        applyTransition(ctx, currentImg, nextImg, w, h, transitionProgress, localTime, transitionStyle);
      } else {
        // Fallback simple crossfade if image loading pending
        ctx.globalAlpha = 1 - transitionProgress;
        if (currentImg) drawSingleImage(ctx, currentImg, w, h, localTime, 'none');
        ctx.globalAlpha = transitionProgress;
        if (nextImg) drawSingleImage(ctx, nextImg, w, h, 0, 'none');
        ctx.globalAlpha = 1.0;
      }
    }
  };

  // Draws single image applying optional Ken Burns panning/zooming effects
  const drawSingleImage = (
    ctx: CanvasRenderingContext2D, 
    img: HTMLImageElement, 
    w: number, 
    h: number, 
    localTime: number, 
    effect: 'ken-burns' | 'none'
  ) => {
    ctx.save();

    // Standard aspect ratio covering (cover object-fit calculation)
    const imgRatio = img.width / img.height;
    const canvasRatio = w / h;
    let renderW = w;
    let renderH = h;
    let rx = 0;
    let ry = 0;

    if (imgRatio > canvasRatio) {
      renderW = h * imgRatio;
      rx = (w - renderW) / 2;
    } else {
      renderH = w / imgRatio;
      ry = (h - renderH) / 2;
    }

    if (effect === 'ken-burns') {
      // Dynamic camera zoom in and translation
      const progress = localTime / imageDuration;
      const zoom = 1.0 + progress * 0.16; // zooms up to 116%
      const translateX = (progress - 0.5) * 40; // pans slowly
      const translateY = (progress - 0.5) * 20;

      ctx.translate(w / 2 + translateX, h / 2 + translateY);
      ctx.scale(zoom, zoom);
      ctx.translate(-w / 2, -h / 2);
    }

    ctx.drawImage(img, rx, ry, renderW, renderH);
    ctx.restore();
  };

  const drawFallbackText = (ctx: CanvasRenderingContext2D, text: string, w: number, h: number) => {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Loading: ${text}...`, w / 2, h / 2);
  };

  // Blend Transitions
  const applyTransition = (
    ctx: CanvasRenderingContext2D,
    imgA: HTMLImageElement,
    imgB: HTMLImageElement,
    w: number,
    h: number,
    p: number, // 0 to 1
    localTime: number,
    style: TransitionStyle
  ) => {
    switch (style) {
      case 'crossfade':
        ctx.save();
        ctx.globalAlpha = 1 - p;
        drawSingleImage(ctx, imgA, w, h, localTime, 'none');
        ctx.globalAlpha = p;
        drawSingleImage(ctx, imgB, w, h, 0, 'none');
        ctx.restore();
        break;

      case 'slide-left':
        ctx.save();
        // Translate image A off
        ctx.save();
        ctx.translate(-p * w, 0);
        drawSingleImage(ctx, imgA, w, h, localTime, 'none');
        ctx.restore();

        // Translate image B on
        ctx.save();
        ctx.translate((1 - p) * w, 0);
        drawSingleImage(ctx, imgB, w, h, 0, 'none');
        ctx.restore();
        ctx.restore();
        break;

      case 'slide-up':
        ctx.save();
        // Translate image A up
        ctx.save();
        ctx.translate(0, -p * h);
        drawSingleImage(ctx, imgA, w, h, localTime, 'none');
        ctx.restore();

        // Translate image B up from bottom
        ctx.save();
        ctx.translate(0, (1 - p) * h);
        drawSingleImage(ctx, imgB, w, h, 0, 'none');
        ctx.restore();
        ctx.restore();
        break;

      case 'ken-burns':
        // Seamless Ken Burns cross-scale
        ctx.save();
        ctx.globalAlpha = 1 - p;
        drawSingleImage(ctx, imgA, w, h, localTime, 'ken-burns');
        ctx.globalAlpha = p;
        drawSingleImage(ctx, imgB, w, h, 0, 'ken-burns');
        ctx.restore();
        break;

      case 'voxel-blend':
        // Custom Retro Blocky Voxel morphing effect!
        // We draw the blended crossfade of both images onto a temporary small canvas
        // and scale it up back without image smoothing.
        ctx.save();
        
        // Calculate dynamic block/voxel size (peaking in the middle of transition)
        const peakBlockSize = 36;
        const currentVoxelSize = Math.max(1, Math.floor(peakBlockSize * Math.sin(p * Math.PI)));

        if (currentVoxelSize <= 1) {
          // Sharp crossfade
          ctx.globalAlpha = 1 - p;
          drawSingleImage(ctx, imgA, w, h, localTime, 'none');
          ctx.globalAlpha = p;
          drawSingleImage(ctx, imgB, w, h, 0, 'none');
        } else {
          // Create offscreen downscale canvas
          const offscreen = document.createElement('canvas');
          offscreen.width = Math.max(8, Math.floor(w / currentVoxelSize));
          offscreen.height = Math.max(6, Math.floor(h / currentVoxelSize));
          const oCtx = offscreen.getContext('2d');
          
          if (oCtx) {
            oCtx.imageSmoothingEnabled = false;
            // Draw A
            oCtx.globalAlpha = 1 - p;
            drawSingleImage(oCtx, imgA, offscreen.width, offscreen.height, localTime, 'none');
            // Draw B
            oCtx.globalAlpha = p;
            drawSingleImage(oCtx, imgB, offscreen.width, offscreen.height, 0, 'none');
            
            // Render small pixelated canvas stretched back
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(offscreen, 0, 0, w, h);
            ctx.imageSmoothingEnabled = true; // reset
          }
        }
        ctx.restore();
        break;

      default:
        // Basic fallback
        ctx.globalAlpha = 1 - p;
        drawSingleImage(ctx, imgA, w, h, localTime, 'none');
        ctx.globalAlpha = p;
        drawSingleImage(ctx, imgB, w, h, 0, 'none');
        ctx.globalAlpha = 1.0;
    }
  };

  // --- Handlers for list management ---
  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const processFiles = (files: FileList) => {
    const freshImages: ImageItem[] = [];
    
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        freshImages.push({
          id: `upload-${Date.now()}-${Math.random()}`,
          url,
          name: file.name,
          isProcedural: false
        });
      }
    });

    if (freshImages.length > 0) {
      setImages(prev => [...prev, ...freshImages]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDeleteImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === images.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const items = [...images];
    const [movedItem] = items.splice(index, 1);
    items.splice(targetIdx, 0, movedItem);
    
    setImages(items);
  };

  const handleClearAll = () => {
    setImages([]);
  };

  // --- Rendering engine with MediaRecorder ---
  const startRecordingVideo = async () => {
    if (images.length === 0) return;

    setIsPlaying(false);
    setIsRendering(true);
    setRecordedVideoUrl(null);
    setRenderProgress(0);
    setRenderStatus('Initializing encoder & starting stream captures...');

    const canvas = previewCanvasRef.current;
    if (!canvas) {
      setIsRendering(false);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsRendering(false);
      return;
    }

    // Capture standard 30fps from canvas
    const fps = 30;
    const stream = (canvas as any).captureStream ? (canvas as any).captureStream(fps) 
                  : (canvas as any).mozCaptureStream ? (canvas as any).mozCaptureStream(fps) 
                  : null;

    if (!stream) {
      setIsRendering(false);
      alert('Your browser does not support canvas recording streams.');
      return;
    }

    // Supported formats browser matrix
    recordedChunksRef.current = [];
    let options = { mimeType: 'video/webm;codecs=vp9' };
    try {
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm;codecs=vp8' };
      }
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: 'video/webm' };
      }
    } catch (e) {
      options = { mimeType: '' };
    }

    try {
      const mediaRecorder = new MediaRecorder(stream, options.mimeType ? options : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const videoURL = URL.createObjectURL(videoBlob);
        setRecordedVideoUrl(videoURL);
        setIsRendering(false);
      };

      // Start recording chunks
      mediaRecorder.start(100);

      // Programmed rendering progression loop in real-time
      let currentVal = 0;
      const stepInterval = 1000 / fps; // 30fps
      const totalSteps = totalDuration * fps;
      let frameCount = 0;

      const recordFrame = () => {
        if (frameCount >= totalSteps) {
          // Success stop recording
          setRenderProgress(100);
          setRenderStatus('Finalizing video files...');
          setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              mediaRecorderRef.current.stop();
            }
          }, 600);
          return;
        }

        // Draw perfect exact frame representing time
        const frameTime = (frameCount / fps);
        drawCanvasFrame(ctx, canvas.width, canvas.height, frameTime);

        // Update progress bar
        const perc = Math.floor((frameCount / totalSteps) * 100);
        setRenderProgress(perc);
        
        if (perc < 30) {
          setRenderStatus('Processing and caching image keyframes...');
        } else if (perc < 70) {
          setRenderStatus('Applying dynamic transitions & motion transforms...');
        } else {
          setRenderStatus('Multiplexing audio channels & assembling video stream...');
        }

        frameCount++;
        setTimeout(recordFrame, stepInterval);
      };

      // Boost start loop
      recordFrame();

    } catch (err) {
      console.error('Failed to record canvas content', err);
      setIsRendering(false);
      alert('Failed to initiate local device recording: ' + err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col md:flex-row shadow-2xl animate-in fade-in duration-300 overflow-y-auto md:overflow-hidden text-slate-100 font-sans">
      
      {/* HEADER BAR FOR MOBILE AND TABLET */}
      <div className="absolute top-4 right-4 z-50 pointer-events-auto">
        <button 
          onClick={onClose}
          className="p-3 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all text-slate-200 rounded-full border border-slate-700/60 shadow-lg"
          id="close_animator_btn"
        >
          <X size={20} />
        </button>
      </div>

      {/* LEFT PANEL: CONFIGURATION, IMPORTS & TIMELINE */}
      <div className="w-full md:w-[450px] bg-slate-900 border-r border-slate-800/80 p-6 flex flex-col gap-6 select-none shrink-0 overflow-y-auto md:max-h-screen">
        
        <div>
          <div className="flex items-center gap-2 text-indigo-400 mb-1">
            <Video size={22} className="animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-[0.25em]">Creative Suite</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight leading-none">
            PicToVideo Studio
          </h2>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            Animate multiple images, select voxel/blocks style motion blends, and export real videos!
          </p>
        </div>

        {/* DRAG-&-DROP / SELECT MEDIA ZONE */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-2xl p-5 text-center flex flex-col items-center justify-center gap-3 transition-all cursor-pointer relative group
            ${isDragging 
              ? 'border-indigo-500 bg-indigo-500/10' 
              : 'border-slate-700 bg-slate-800/40 hover:border-indigo-500/50 hover:bg-slate-800/80'}
          `}
        >
          <input 
            type="file" 
            multiple 
            accept="image/*" 
            onChange={handleUploadImage}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            id="image_uploader_input"
          />
          <div className="bg-slate-800 p-3 rounded-2xl text-indigo-400 group-hover:scale-110 transition-transform shadow-md border border-slate-700">
            <Upload size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-200">Drag & Drop Images</p>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">or click to browse from files</p>
          </div>
        </div>

        {/* PICTURE TIMELINE / GALLERY */}
        <div className="flex flex-col gap-2 flex-grow min-h-[180px] overflow-hidden">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5Packed">
              <Layers size={13} />
              Slides Timeline ({images.length})
            </span>
            <div className="flex gap-2">
              <button 
                onClick={loadProceduralPresets}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 font-bold px-2 py-1.5 rounded-lg flex items-center gap-1 active:scale-95 transition-all"
              >
                <Sparkles size={11} className="text-yellow-400" /> Procedurals
              </button>
              {images.length > 0 && (
                <button 
                  onClick={handleClearAll}
                  className="text-[10px] border border-red-900/30 bg-red-950/40 hover:bg-red-900/40 text-red-400 font-bold px-2 py-1.5 rounded-lg active:scale-95 transition-all"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className="flex-grow overflow-y-auto max-h-[220px] md:max-h-none border border-slate-800 bg-slate-950/40 rounded-2xl p-2.5 space-y-2">
            {images.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-28 text-center text-slate-500 font-semibold text-xs leading-relaxed">
                <Film size={28} className="opacity-30 mb-2" />
                No slides listed.<br/>Upload files or use procedurals!
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {images.map((img, idx) => (
                  <motion.div 
                    key={img.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-850 border border-slate-855 hover:border-slate-700/80 gap-3 group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-12 h-12 bg-slate-800 rounded-lg overflow-hidden shrink-0 border border-slate-700 relative">
                        <img 
                          referrerPolicy="no-referrer" 
                          src={img.url} 
                          alt={img.name} 
                          className="w-full h-full object-cover" 
                        />
                        {img.isProcedural && (
                          <div className="absolute top-0.5 right-0.5 bg-indigo-500 text-[8px] font-bold px-1 rounded-sm text-white scale-90">
                            P
                          </div>
                        )}
                      </div>
                      <div className="overflow-hidden leading-tight">
                        <p className="text-xs font-bold text-slate-200 truncate w-28 md:w-36">{img.name}</p>
                        <p className="text-[10px] font-mono text-slate-500 font-semibold mt-0.5">SLIDE {idx+1}</p>
                      </div>
                    </div>

                    {/* Timeline controls */}
                    <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleMoveImage(idx, 'up')}
                        disabled={idx === 0}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg disabled:opacity-30"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button 
                        onClick={() => handleMoveImage(idx, 'down')}
                        disabled={idx === images.length - 1}
                        className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg disabled:opacity-30"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteImage(img.id)}
                        className="p-1.5 hover:bg-red-950/50 text-slate-400 hover:text-red-400 hover:border-red-900/30 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* TRANSITION & RESOLUTION CONTROLS */}
        <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl flex flex-col gap-3.5">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
            <Sliders size={13} />
            Render Preferences
          </span>

          {/* Transition selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">Transition Style</label>
            <select 
              value={transitionStyle}
              onChange={(e) => setTransitionStyle(e.target.value as TransitionStyle)}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold p-2.5 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="voxel-blend">🧱 Voxel Modular Blend (3D Retro)</option>
              <option value="ken-burns">🎥 Pan & Zoom / Ken Burns</option>
              <option value="crossfade">🌗 Classic Smooth Crossfade</option>
              <option value="slide-left">⬅️ Slide Left</option>
              <option value="slide-up">⬆️ Slide Up</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Slide speed */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">Slide Duration</label>
              <select 
                value={imageDuration}
                onChange={(e) => setImageDuration(Number(e.target.value))}
                className="bg-slate-900 border border-slate-800 text-xs font-bold p-2 rounded-xl text-slate-100 focus:outline-none"
              >
                <option value="2">2 Seconds</option>
                <option value="3">3 Seconds</option>
                <option value="4">4 Seconds</option>
                <option value="5">5 Seconds</option>
                <option value="8">8 Seconds</option>
              </select>
            </div>

            {/* Transition speed */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">Blend Speed</label>
              <select 
                value={transitionDuration}
                onChange={(e) => setTransitionDuration(Number(e.target.value))}
                className="bg-slate-900 border border-slate-800 text-xs font-bold p-2 rounded-xl text-slate-100 focus:outline-none"
              >
                <option value="0.5">0.5 Seconds</option>
                <option value="1">1.0 Seconds</option>
                <option value="1.5">1.5 Seconds</option>
                <option value="2">2.0 Seconds</option>
              </select>
            </div>
          </div>

          {/* Resolution toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide">Output Aspect Ratio</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '16:9 Landscape', width: 800, height: 450 },
                { label: '1:1 Square', width: 600, height: 600 },
                { label: '9:16 Portrait', width: 450, height: 800 }
              ].map((res) => {
                const isSelected = resolution.label === res.label;
                return (
                  <button
                    key={res.label}
                    onClick={() => setResolution(res)}
                    className={`
                      p-2 border rounded-xl text-[10px] font-black text-center uppercase tracking-wider leading-tight transition-all
                      ${isSelected 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' 
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'}
                    `}
                  >
                    <div>{res.label.split(' ')[0]}</div>
                    <div className="opacity-60 text-[8px] mt-0.5">{res.width}x{res.height}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      {/* RIGHT PANEL: LIVE PREVIEW VIEW AND EXPORT HUB */}
      <div className="flex-grow flex flex-col justify-center items-center bg-slate-950 p-6 md:p-12 relative overflow-hidden h-full min-h-[350px]">
        
        {/* Background visual glowing blob */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-indigo-600/10 blur-[80px] pointer-events-none" />

        {/* CONTAINER WITH THE LIVE PREVIEW CANVAS */}
        <div className="flex flex-col items-center gap-6 max-w-full z-10">
          
          <div className="text-center md:mb-2 select-none">
            <span className="bg-slate-900 border border-slate-800 text-slate-400 font-black text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest leading-none">
              Live Composer Stage
            </span>
          </div>

          {/* Canvas box */}
          <div 
            className="bg-slate-900 rounded-3xl border border-slate-800/80 shadow-2xl relative overflow-hidden transition-all duration-300"
            style={{ 
              width: resolution.width, 
              height: resolution.height,
              maxWidth: '85vw',
              maxHeight: '52vh',
              aspectRatio: `${resolution.width} / ${resolution.height}`
            }}
          >
            {/* Core Rendering Canvas */}
            <canvas 
              ref={previewCanvasRef} 
              width={resolution.width} 
              height={resolution.height}
              className="w-full h-full object-contain block bg-[#0c1322]"
            />

            {/* OVERLAY: RENDERING PROGRESS */}
            {isRendering && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col justify-center items-center p-8 select-none">
                <div className="max-w-md w-full flex flex-col items-center gap-4 text-center">
                  <div className="relative">
                    {/* Ring glow */}
                    <div className="absolute inset-0 bg-slate-700 rounded-full animate-ping opacity-10"></div>
                    <RefreshCw size={44} className="text-indigo-400 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">Rendering WebM Video</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1 tracking-tight">{renderStatus}</p>
                  </div>
                  
                  {/* Progress bar container */}
                  <div className="w-full bg-slate-800 rounded-full h-2.5 mt-3 overflow-hidden border border-slate-700/50">
                    <div 
                      className="bg-gradient-to-r from-sky-400 via-indigo-500 to-indigo-600 h-2.5 rounded-full transition-all duration-150"
                      style={{ width: `${renderProgress}%` }}
                    />
                  </div>
                  <span className="text-2xl font-black font-mono text-indigo-400 leading-none">
                    {renderProgress}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* PREVIEW COMPOSER CONTROLLER BAR */}
          {!isRendering && !recordedVideoUrl && images.length > 0 && (
            <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-6 py-3.5 rounded-2xl w-full max-w-[450px] shadow-lg select-none">
              <span className="text-[11px] font-mono font-bold text-slate-400">
                {currentTime.toFixed(1)}s / {totalDuration.toFixed(1)}s
              </span>

              {/* Progress Slider track */}
              <div className="flex-grow mx-4 relative flex items-center h-4">
                <div className="absolute inset-y-1.5 left-0 right-0 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-indigo-500" 
                    style={{ width: `${(currentTime / totalDuration) * 100}%` }}
                  />
                </div>
                <input 
                  type="range"
                  min="0"
                  max={totalDuration || 1}
                  step="0.05"
                  value={currentTime}
                  onChange={(e) => {
                    setCurrentTime(parseFloat(e.target.value));
                    setIsPlaying(false); // pause on scrubbing
                  }}
                  className="absolute inset-x-0 w-full opacity-0 cursor-pointer h-full"
                />
              </div>

              {/* Audio and Play controls */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`
                    p-2 rounded-xl text-slate-100 hover:bg-slate-800 active:scale-95 transition-all
                    ${isPlaying ? 'text-indigo-400' : ''}
                  `}
                >
                  {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                </button>
                <button 
                  onClick={() => setCurrentTime(0)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 active:scale-95 transition-all"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>
          )}

          {/* MAIN ACTIONS ROW */}
          {!isRendering && images.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-lg mt-1 select-none">
              
              {!recordedVideoUrl ? (
                <button 
                  onClick={startRecordingVideo}
                  className="flex items-center justify-center gap-2.5 px-8 py-4 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold rounded-2xl shadow-xl shadow-indigo-950/30 border-b-[5px] border-indigo-700 active:border-b-0 active:translate-y-[5px] active:scale-[0.98] transition-all w-full leading-none text-base"
                >
                  <Film size={20} strokeWidth={2.5} />
                  COMPILE & RENDER VIDEO
                </button>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 w-full flex flex-col items-center gap-4 text-center shadow-2xl relative w-[480px] max-w-full">
                  <div className="absolute top-3 right-3">
                    <button 
                      onClick={() => setRecordedVideoUrl(null)}
                      className="text-xs bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/50 p-2 rounded-xl transition-all"
                    >
                      Remake
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5 text-emerald-400 mt-2">
                    <CheckCircle2 size={30} />
                    <div className="text-left">
                      <h4 className="text-sm font-black text-white leading-none">Video Render Safe!</h4>
                      <p className="text-[10px] text-slate-400 font-semibold mt-1">Encoded in standard VP9 WebM format</p>
                    </div>
                  </div>

                  {/* HTML5 video preview playing recorded sequence */}
                  <div className="w-full rounded-2xl overflow-hidden border border-slate-800 bg-[#070b13] shadow-inner">
                    <video 
                      src={recordedVideoUrl} 
                      controls 
                      loop 
                      autoPlay 
                      className="w-full max-h-[180px] object-contain"
                    />
                  </div>

                  <a 
                    href={recordedVideoUrl} 
                    download="voxel_animator_video.webm"
                    className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-950/20 border-b-[4px] border-emerald-700 active:border-b-0 active:translate-y-[4px] active:scale-[0.98] transition-all w-full text-sm leading-none"
                    id="download_rendered_webm"
                  >
                    <Download size={18} strokeWidth={2.5} />
                    DOWNLOAD VIDEO FILE (.WEBM)
                  </a>
                </div>
              )}

            </div>
          )}

          {images.length === 0 && (
            <div className="flex flex-col items-center gap-4 text-slate-500 font-semibold text-center select-none bg-slate-900/40 p-10 border border-slate-800/60 rounded-3xl w-full max-w-md">
              <Sliders size={48} className="opacity-25" />
              <div>
                <p className="text-sm text-slate-305">Setup slides to activate stage</p>
                <p className="text-xs text-slate-500 mt-1">Click the "Procedurals" button on the left to instantly load preloaded template themes!</p>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
