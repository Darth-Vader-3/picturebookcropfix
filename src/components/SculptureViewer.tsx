import React, { useState, useEffect, useRef } from 'react';
import { SCULPTURE_MODELS } from '../data';
import { Sculpture3DPoint, SculptureModel } from '../types';
import { Rotate3d, ZoomIn, ZoomOut, Sparkles, Palette } from 'lucide-react';
import { playChime } from '../data';

interface SculptureViewerProps {
  modelId: string;
  colors?: string[];
  educationBuddyTip: string;
}

type MaterialType = 'clay' | 'marble' | 'bronze' | 'wood' | 'gold' | 'jade' | 'terracotta' | 'glass' | 'obsidian';

export default function SculptureViewer({ modelId, colors = [], educationBuddyTip }: SculptureViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Model data
  const model: SculptureModel = SCULPTURE_MODELS[modelId] || SCULPTURE_MODELS.pot;

  // View state
  const [rotationX, setRotationX] = useState<number>(-0.4); // Pitch
  const [rotationY, setRotationY] = useState<number>(0.6);  // Yaw
  const [scale, setScale] = useState<number>(model.defaultScale);
  const [material, setMaterial] = useState<MaterialType>('clay');
  const [selectedColor, setSelectedColor] = useState<string>(colors[0] || '#ea580c');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Light spotlight color state
  const [lightColor, setLightColor] = useState<{ r: number; g: number; b: number }>({ r: 255, g: 255, b: 255 });

  // Reset scale when model changes
  useEffect(() => {
    setScale(model.defaultScale);
  }, [modelId]);

  // Adjust canvas resolution dynamically on resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      canvasRef.current.width = rect.width * window.devicePixelRatio;
      canvasRef.current.height = rect.height * window.devicePixelRatio;
      canvasRef.current.style.width = '100%';
      canvasRef.current.style.height = '100%';
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const currentScale = scale * (width / 500); // Scale relative to canvas size

    // Light source vector (from top-right, front)
    const light = { x: 1, y: 1.2, z: 1.5 };
    // Normalize light
    const mag = Math.sqrt(light.x * light.x + light.y * light.y + light.z * light.z);
    const lightNormal = { x: light.x / mag, y: light.y / mag, z: light.z / mag };

    // 1. Rotate vertices
    const rotatedVertices = model.vertices.map((v) => {
      // Rotation Y (Yaw)
      let cosY = Math.cos(rotationY);
      let sinY = Math.sin(rotationY);
      let x1 = v.x * cosY - v.z * sinY;
      let z1 = v.x * sinY + v.z * cosY;

      // Rotation X (Pitch)
      let cosX = Math.cos(rotationX);
      let sinX = Math.sin(rotationX);
      let y2 = v.y * cosX - z1 * sinX;
      let z2 = v.y * sinX + z1 * cosX;

      return { x: x1, y: y2, z: z2 };
    });

    // 2. Map faces with depth (Painter's Algorithm)
    interface FaceDepth {
      faceIdx: number;
      avgZ: number;
    }

    const faceDepths: FaceDepth[] = model.faces.map((face, idx) => {
      let sumZ = 0;
      face.indices.forEach((vIdx) => {
        sumZ += rotatedVertices[vIdx].z;
      });
      const avgZ = sumZ / face.indices.length;
      return { faceIdx: idx, avgZ };
    });

    // Sort back-to-front (smaller Z is deeper away in orthographic model where camera is on negative Z, or vice versa depending on formulation)
    // To ensure painters algorithm is correct:
    // Let's assume camera is looking down the Z-axis (towards negative Z).
    // The faces with the SMALLER average Z are FURTHER AWAY, and should be drawn FIRST (behind).
    // Faces with LARGER average Z are CLOSER, drawn LAST (in front).
    faceDepths.sort((a, b) => a.avgZ - b.avgZ);

    // 3. Draw each face
    faceDepths.forEach(({ faceIdx }) => {
      const face = model.faces[faceIdx];
      const pIdx = face.indices;

      // Compute simple face normal for flat shading
      // Normal vector cross product of (V1 - V0) x (V2 - V0)
      const v0 = rotatedVertices[pIdx[0]];
      const v1 = rotatedVertices[pIdx[1]];
      const v2 = rotatedVertices[pIdx[2]];

      const u = { x: v1.x - v0.x, y: v1.y - v0.y, z: v1.z - v0.z };
      const w = { x: v2.x - v0.x, y: v2.y - v0.y, z: v2.z - v0.z };

      const normal = {
        x: u.y * w.z - u.z * w.y,
        y: u.z * w.x - u.x * w.z,
        z: u.x * w.y - u.y * w.x
      };

      // Normalize normal
      const normalMag = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
      if (normalMag === 0) return;
      const normalNormalized = { x: normal.x / normalMag, y: normal.y / normalMag, z: normal.z / normalMag };

      // Back-face culling check: if normal points away from viewer (normal.z < 0), we skip it!
      // This increases rendering quality and performance.
      if (normalNormalized.z < -0.15) return;

      // Dot product for shading: ranges roughly from -1 to 1 (clamp to 0-1)
      const dot = normalNormalized.x * lightNormal.x + normalNormalized.y * lightNormal.y + normalNormalized.z * lightNormal.z;
      const ambient = 0.25;
      const diffuse = Math.max(0, dot) * 0.75;
      const intensity = ambient + diffuse;

      // Determine material color palette modification
      let baseHex = face.color;
      if (material === 'clay') {
        baseHex = selectedColor; // Paint clay model with selected glaze color
      } else if (material === 'marble') {
        baseHex = '#f8fafc'; // Clean slate marble
      } else if (material === 'bronze') {
        baseHex = '#92400e'; // Golden antique bronze
      } else if (material === 'wood') {
        baseHex = '#78350f'; // Warm cedar wood
      } else if (material === 'gold') {
        baseHex = '#eab308'; // Royal shimmering gold
      } else if (material === 'jade') {
        baseHex = '#10b981'; // Imperial translucent jade
      } else if (material === 'terracotta') {
        baseHex = '#c2410c'; // Rustic baked terracotta
      } else if (material === 'glass') {
        baseHex = '#38bdf8'; // Crystal frost glass
      } else if (material === 'obsidian') {
        baseHex = '#1e293b'; // Dark volcanic obsidian
      }

      // Convert hex to RGB to apply lighting intensity and spotlight colors
      const r_hex = parseInt(baseHex.substring(1, 3), 16);
      const g_hex = parseInt(baseHex.substring(3, 5), 16);
      const b_hex = parseInt(baseHex.substring(5, 7), 16);

      // Mix material color with custom ambient light colors
      const r_mix = Math.min(255, Math.floor(r_hex * intensity * (lightColor.r / 255)));
      const g_mix = Math.min(255, Math.floor(g_hex * intensity * (lightColor.g / 255)));
      const b_mix = Math.min(255, Math.floor(b_hex * intensity * (lightColor.b / 255)));

      const finalFillColor = `rgb(${r_mix}, ${g_mix}, ${b_mix})`;

      // Draw polygon with smooth thick borders
      ctx.beginPath();
      pIdx.forEach((idx, i) => {
        const v = rotatedVertices[idx];
        const sx = centerX + v.x * currentScale;
        const sy = centerY - v.y * currentScale; // Flip Y for standard Cartesian graph coordinates
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      });
      ctx.closePath();

      // Flat face fill
      ctx.fillStyle = finalFillColor;
      ctx.fill();

      // Styled outlines to create a clay / cartoon-crafted texture line
      ctx.strokeStyle = material === 'marble' ? 'rgba(100,116,139,0.15)' : 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // Draw some shining sparkles or particles around
    ctx.save();
    ctx.fillStyle = 'rgba(253, 224, 71, 0.45)';
    // Procedural starry specks
    ctx.restore();
  }, [rotationX, rotationY, scale, material, selectedColor, lightColor, modelId]);

  // Touch and mouse drags
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    
    // Sensitivity factor
    const rotSpeed = 0.007;
    setRotationY((prev) => prev + dx * rotSpeed);
    setRotationX((prev) => Math.max(-1.4, Math.min(1.4, prev + dy * rotSpeed)));
    
    dragStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  // Touch triggers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.current.x;
    const dy = e.touches[0].clientY - dragStart.current.y;

    const rotSpeed = 0.009;
    setRotationY((prev) => prev + dx * rotSpeed);
    setRotationX((prev) => Math.max(-1.4, Math.min(1.4, prev + dy * rotSpeed)));

    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const selectColor = (c: string) => {
    setSelectedColor(c);
    playChime('clay');
  };

  const selectMaterial = (m: MaterialType) => {
    setMaterial(m);
    playChime('wood');
  };

  const toggleSpotlight = (colorName: string) => {
    playChime('sparkle');
    if (colorName === 'warm') {
      setLightColor({ r: 255, g: 210, b: 150 });
    } else if (colorName === 'cool') {
      setLightColor({ r: 160, g: 210, b: 255 });
    } else if (colorName === 'pink') {
      setLightColor({ r: 255, g: 150, b: 220 });
    } else {
      setLightColor({ r: 255, g: 255, b: 255 });
    }
  };

  return (
    <div className="flex flex-col h-full bg-orange-50/40 p-4 rounded-3xl border-4 border-orange-200 overflow-hidden relative">
      
      {/* Top action and materials switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 z-10">
        <div className="flex items-center gap-1 select-none">
          <Rotate3d className="w-5 h-5 text-orange-600 animate-spin-slow" />
          <span className="font-display font-medium text-sm text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
            3D Studio
          </span>
        </div>

        {/* Material Selection Tubes */}
        <div className="flex flex-wrap items-center gap-1 bg-orange-100/80 p-1.5 rounded-2xl border border-orange-200">
          {[
            { id: 'clay', label: '🎨 Clay' },
            { id: 'marble', label: '🏛️ Marble' },
            { id: 'wood', label: '🪵 Wood' },
            { id: 'bronze', label: '🥉 Bronze' },
            { id: 'gold', label: '👑 Gold' },
            { id: 'jade', label: '❇️ Jade' },
            { id: 'terracotta', label: '🏺 Terracotta' },
            { id: 'glass', label: '💎 Glass' },
            { id: 'obsidian', label: '🖤 Obsidian' }
          ].map((mat) => (
            <button
              key={mat.id}
              id={`material-${mat.id}`}
              onClick={() => selectMaterial(mat.id as MaterialType)}
              className={`px-2 py-0.5 rounded-lg text-[10px] md:text-xs font-display font-bold transition-all cursor-pointer ${
                material === mat.id
                  ? 'bg-amber-600 text-white shadow-xs font-extrabold'
                  : 'text-amber-900 bg-white/60 hover:bg-orange-200/60'
              }`}
            >
              {mat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main 3D Canvas Box */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-white hover:bg-orange-50/20 rounded-2xl border-2 border-dashed border-orange-200 group overflow-hidden cursor-grab active:cursor-grabbing text-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUpOrLeave}
        id="sculpture-canvas-container"
      >
        <canvas ref={canvasRef} className="block w-full h-full" />

        {/* Gentle UI hint overlay */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none text-xs text-amber-700 font-display select-none">
          <span className="bg-white/95 px-3 py-1.5 rounded-xl border border-orange-100 shadow-sm flex items-center gap-1">
            <Rotate3d className="w-4 h-4 text-orange-500 animate-pulse" />
            Drag to Rotate Craft
          </span>
          <span className="bg-amber-800 text-amber-100 px-3 py-1.5 rounded-xl shadow-sm">
            {model.name}
          </span>
        </div>

        {/* Zoom controls floating */}
        <div className="absolute right-3 top-3 flex flex-col gap-2 pointer-events-auto">
          <button
            id="sculpture-zoom-in"
            onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(s + 20, 200)); playChime('pop'); }}
            className="p-2 rounded-xl bg-white border border-orange-200 text-orange-600 hover:bg-orange-100 transition shadow-sm"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            id="sculpture-zoom-out"
            onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(s - 20, 40)); playChime('pop'); }}
            className="p-2 rounded-xl bg-white border border-orange-200 text-orange-600 hover:bg-orange-100 transition shadow-sm"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Color Glaze & Lights Shelf - Rendered below 3D */}
      <div className="mt-4 bg-orange-50 p-3 rounded-2xl border border-orange-100 flex flex-col gap-3 z-10">
        
        {/* Clay Paint Colors */}
        {material === 'clay' && colors.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-display font-medium text-amber-900 flex items-center gap-1">
              <Palette className="w-4 h-4 text-orange-500" /> Choose Glaze Paint Color:
            </label>
            <div className="flex items-center gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  id={`color-glaze-${color.replace('#', '')}`}
                  onClick={() => selectColor(color)}
                  className={`w-7 h-7 rounded-full border-2 transition-all transform hover:scale-110 active:scale-95 ${
                    selectedColor === color
                      ? 'border-amber-700 ring-2 ring-orange-300 ring-offset-1 scale-110'
                      : 'border-white shadow-sm'
                  }`}
                  style={{ backgroundColor: color }}
                  title={`Paint with ${color}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Spotlight Lights Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-display font-medium text-amber-900 flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" /> Spotlight Lighting:
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => toggleSpotlight('white')}
              className={`px-3 py-1 rounded-xl text-xs font-display font-medium border transition ${
                lightColor.r === 255 && lightColor.g === 255 && lightColor.b === 255
                  ? 'bg-amber-200 border-amber-300 text-amber-950 font-semibold'
                  : 'bg-white border-orange-200 text-amber-800 hover:bg-orange-100/50'
              }`}
              id="spotlight-white"
            >
              ☀️ White
            </button>
            <button
              onClick={() => toggleSpotlight('warm')}
              className={`px-3 py-1 rounded-xl text-xs font-display font-medium border transition ${
                lightColor.g === 210
                  ? 'bg-orange-200 border-orange-300 text-orange-950 font-semibold'
                  : 'bg-white border-orange-200 text-amber-800 hover:bg-orange-100/50'
              }`}
              id="spotlight-warm"
            >
              🌅 Warm Sunset
            </button>
            <button
              onClick={() => toggleSpotlight('cool')}
              className={`px-3 py-1 rounded-xl text-xs font-display font-medium border transition ${
                lightColor.b === 255 && lightColor.r === 160
                  ? 'bg-blue-200 border-blue-300 text-blue-950 font-semibold'
                  : 'bg-white border-orange-200 text-amber-800 hover:bg-orange-100/50'
              }`}
              id="spotlight-cool"
            >
              ❄️ Cool Winter
            </button>
            <button
              onClick={() => toggleSpotlight('pink')}
              className={`px-3 py-1 rounded-xl text-xs font-display font-medium border transition ${
                lightColor.b === 220
                  ? 'bg-pink-200 border-pink-300 text-pink-950 font-semibold'
                  : 'bg-white border-orange-200 text-amber-800 hover:bg-orange-100/50'
              }`}
              id="spotlight-pink"
            >
              🌸 Pink Tulip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
