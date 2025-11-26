import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Info, MousePointer2 } from 'lucide-react';

interface SimState {
  x: number;
  y: number;
  t: number;
}

const App = () => {
  // --- State ---
  const [isPlaying, setIsPlaying] = useState(true);
  const [mu, setMu] = useState(1.0); // Damping parameter
  const [speed, setSpeed] = useState(1); // Simulation speed steps per frame
  const [showInfo, setShowInfo] = useState(true);

  // Simulation state refs to avoid re-renders during animation loop
  const stateRef = useRef<SimState>({ x: 0.1, y: 0.1, t: 0 });
  const historyRef = useRef<SimState[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeSeriesCanvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);

  // Constants
  const DT = 0.05;
  const MAX_HISTORY = 500; // Number of points to keep for drawing the tail
  const SCALE = 60; // Pixels per unit
  const WIDTH = 400; // Canvas width
  const HEIGHT = 400; // Canvas height

  // --- Math: Runge-Kutta 4 Solver ---
  // System:
  // dx/dt = y
  // dy/dt = mu * (1 - x^2) * y - x

  const derivatives = useCallback((x: number, y: number, m: number) => {
    return {
      dx: y,
      dy: m * (1 - x * x) * y - x
    };
  }, []);

  const stepRK4 = useCallback((state: SimState, m: number, dt: number): SimState => {
    const { x, y } = state;

    const k1 = derivatives(x, y, m);
    const k2 = derivatives(x + k1.dx * dt * 0.5, y + k1.dy * dt * 0.5, m);
    const k3 = derivatives(x + k2.dx * dt * 0.5, y + k2.dy * dt * 0.5, m);
    const k4 = derivatives(x + k3.dx * dt, y + k3.dy * dt, m);

    return {
      x: x + (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx) * (dt / 6),
      y: y + (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy) * (dt / 6),
      t: state.t + dt
    };
  }, [derivatives]);

  // --- Drawing Functions ---
  const drawPhaseSpace = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#1e293b'; // slate-800
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw Grid & Axes
    ctx.strokeStyle = '#334155'; // slate-700
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Grid
    for(let i = 0; i <= WIDTH; i+=SCALE) {
      ctx.moveTo(i, 0); ctx.lineTo(i, HEIGHT);
      ctx.moveTo(0, i); ctx.lineTo(WIDTH, i);
    }
    ctx.stroke();

    // Main Axes
    ctx.strokeStyle = '#94a3b8'; // slate-400
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 0); ctx.lineTo(WIDTH / 2, HEIGHT);
    ctx.moveTo(0, HEIGHT / 2); ctx.lineTo(WIDTH, HEIGHT / 2);
    ctx.stroke();

    // Draw Trajectory
    if (historyRef.current.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8'; // sky-400
      ctx.lineWidth = 3;
      
      // Draw limit cycle tail with fading opacity effect (optional, keep simple for now)
      historyRef.current.forEach((point, index) => {
        const px = WIDTH / 2 + point.x * SCALE;
        const py = HEIGHT / 2 - point.y * SCALE; // Invert Y for canvas
        if (index === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    // Draw Current Head
    const headX = WIDTH / 2 + stateRef.current.x * SCALE;
    const headY = HEIGHT / 2 - stateRef.current.y * SCALE;
    
    ctx.fillStyle = '#f472b6'; // pink-400
    ctx.beginPath();
    ctx.arc(headX, headY, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Shadow/Glow
    ctx.shadowColor = '#f472b6';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }, []);

  const drawTimeSeries = useCallback(() => {
    const canvas = timeSeriesCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, WIDTH, 150);

    // Axes
    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(0, 75); ctx.lineTo(WIDTH, 75); // Center line (x=0)
    ctx.stroke();

    if (historyRef.current.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#38bdf8'; // sky-400
      ctx.lineWidth = 2;
      
      // We want to draw the last N points mapping time to X axis
      const totalPoints = historyRef.current.length;
      const stepPixels = WIDTH / MAX_HISTORY;
      
      historyRef.current.forEach((point, index) => {
        // Calculate x position based on index (scrolling effect)
        // Newest point is at the right edge
        const xPos = WIDTH - ((totalPoints - 1 - index) * stepPixels);
        const yPos = 75 - point.x * (SCALE / 2); // Scaled down slightly for height fit
        
        if (index === 0 || xPos < 0) ctx.moveTo(xPos, yPos);
        else ctx.lineTo(xPos, yPos);
      });
      ctx.stroke();
    }
  }, []);

  // --- Animation Loop ---
  useEffect(() => {
    const animate = () => {
      if (isPlaying) {
        // Perform multiple integration steps per frame for smoothness/speed
        for (let i = 0; i < speed; i++) {
          stateRef.current = stepRK4(stateRef.current, mu, DT);

          // Update history
          historyRef.current.push({ ...stateRef.current });
          if (historyRef.current.length > MAX_HISTORY) {
            historyRef.current.shift();
          }
        }
      }

      drawPhaseSpace();
      drawTimeSeries();

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current !== undefined) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPlaying, mu, speed, stepRK4, drawPhaseSpace, drawTimeSeries]);

  // --- Interaction ---
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert pixel to math coordinates
    const x = (clickX - WIDTH / 2) / SCALE;
    const y = -(clickY - HEIGHT / 2) / SCALE;

    stateRef.current = { x, y, t: 0 };
    historyRef.current = []; // Clear history on new start
    if (!isPlaying) setIsPlaying(true);
  };

  const handleReset = () => {
    stateRef.current = { x: 0.1, y: 0.1, t: 0 };
    historyRef.current = [];
    setIsPlaying(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans flex flex-col items-center">
      
      <header className="max-w-4xl w-full mb-8 text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-sky-400 to-pink-400 bg-clip-text text-transparent mb-2">
          Van der Pol Oscillator
        </h1>
        <p className="text-slate-400">
          Interactive simulation of non-conservative oscillator with non-linear damping.
        </p>
      </header>

      <main className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left Column: Visualizations */}
        <div className="space-y-4">
          
          {/* Phase Space Canvas */}
          <div className="relative group">
            <div className="absolute top-2 left-2 bg-slate-800/80 px-2 py-1 rounded text-xs text-sky-300 font-mono pointer-events-none border border-slate-700">
              Phase Space (y vs x)
            </div>
            <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-xs text-slate-400 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              <MousePointer2 size={12} /> Click to Set State
            </div>
            <canvas
              ref={canvasRef}
              width={WIDTH}
              height={HEIGHT}
              onClick={handleCanvasClick}
              className="w-full h-auto bg-slate-800 rounded-lg shadow-xl cursor-crosshair border border-slate-700 hover:border-sky-500/50 transition-colors"
            />
          </div>

          {/* Time Series Canvas */}
          <div className="relative">
            <div className="absolute top-2 left-2 bg-slate-800/80 px-2 py-1 rounded text-xs text-sky-300 font-mono pointer-events-none border border-slate-700">
              Time Series (x vs t)
            </div>
            <canvas
              ref={timeSeriesCanvasRef}
              width={WIDTH}
              height={150}
              className="w-full h-auto bg-slate-800 rounded-lg shadow-xl border border-slate-700"
            />
          </div>
        </div>

        {/* Right Column: Controls & Info */}
        <div className="space-y-6">
          
          {/* Controls Panel */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-lg border border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Controls</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`p-2 rounded-lg transition-colors ${isPlaying ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </button>
                <button
                  onClick={handleReset}
                  className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                  title="Reset"
                >
                  <RotateCcw size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Mu Slider */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-slate-300">
                    Damping Parameter (<span className="font-serif italic">μ</span>)
                  </label>
                  <span className="text-sm font-mono text-pink-400">{mu.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={mu}
                  onChange={(e) => {
                    setMu(parseFloat(e.target.value));
                    historyRef.current = []; // Optional: clear history on param change to see effect clearly
                  }}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Harmonic (0)</span>
                  <span>Relaxation (5)</span>
                </div>
              </div>

              {/* Speed Slider */}
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-slate-300">Simulation Speed</label>
                  <span className="text-sm font-mono text-sky-400">{speed}x</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={speed}
                  onChange={(e) => setSpeed(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Info Panel */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
            <button 
              onClick={() => setShowInfo(!showInfo)}
              className="flex items-center gap-2 text-slate-300 hover:text-white mb-2 w-full"
            >
              <Info size={18} />
              <span className="font-semibold">What is happening?</span>
            </button>
            
            {showInfo && (
              <div className="text-sm text-slate-400 space-y-3 mt-3 leading-relaxed">
                <p>
                  The <strong className="text-slate-200">Van der Pol oscillator</strong> is a non-conservative system with non-linear damping. It evolves over time according to the equation:
                </p>
                <div className="bg-slate-900/50 p-3 rounded font-mono text-center text-slate-200 text-xs md:text-sm my-2 border border-slate-800">
                  x'' - μ(1 - x²)x' + x = 0
                </div>
                <p>
                  Unlike a simple pendulum which can have any amplitude depending on energy, this system tends towards a specific trajectory called a <strong className="text-pink-400">limit cycle</strong>.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>If <strong className="text-slate-200">μ = 0</strong>, it behaves like a simple harmonic oscillator (circle).</li>
                  <li>As <strong className="text-slate-200">μ increases</strong>, the damping becomes stronger and non-linear, changing the shape into a "relaxation" oscillation.</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
