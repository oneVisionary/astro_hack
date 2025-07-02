import React, { useEffect, useRef, useState } from 'react';
import { Satellite, RefreshCw, Info, Clock, MapPin, Database, Globe, Zap, TrendingUp, Calendar, X, BarChart3 } from 'lucide-react';

declare global {
  interface Window {
    p5: any;
    satellite: any;
  }
}

interface DebrisObject {
  name: string;
  noradId: string;
  satrec: any;
  positions: { x: number; y: number; lat: number; lon: number; timestamp: number }[];
  currentPos: { x: number; y: number; lat: number; lon: number };
  category: string;
  launchDate?: string;
  country?: string;
}

interface TooltipData {
  name: string;
  noradId: string;
  lat: number;
  lon: number;
  x: number;
  y: number;
  category: string;
  launchDate?: string;
  country?: string;
}

interface PredictionData {
  year: number;
  totalDebris: number;
  largeDebris: number;
  smallDebris: number;
  collisionEvents: number;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
}

const DebrisSimulation: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const p5InstanceRef = useRef<any>(null);
  const predictionChartRef = useRef<HTMLCanvasElement>(null);
  const [debrisObjects, setDebrisObjects] = useState<DebrisObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, debris: 0, satellites: 0, rocketBodies: 0 });
  const [dataSource, setDataSource] = useState<'cosmos' | 'recent'>('recent');
  const [showPredictions, setShowPredictions] = useState(false);
  const [predictionData, setPredictionData] = useState<PredictionData[]>([]);

  const fetchTLEData = async (source: 'cosmos' | 'recent' = 'recent') => {
    try {
      setIsLoading(true);
      setError(null);
      
      const url = source === 'cosmos' 
        ? 'https://celestrak.org/NORAD/elements/gp.php?GROUP=cosmos-2251-debris&FORMAT=tle'
        : 'https://celestrak.org/NORAD/elements/gp.php?GROUP=last-30-days&FORMAT=tle';
      
      const response = await fetch(url, { mode: 'cors' });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const tleData = await response.text();
      return parseTLEData(tleData, source);
    } catch (err) {
      console.error('Error fetching TLE data:', err);
      setError(`Unable to fetch live TLE data from ${source === 'cosmos' ? 'COSMOS 2251' : 'recent launches'}. Using simulated data for demonstration.`);
      return generateSimulatedDebris(source);
    }
  };

  const parseTLEData = (tleData: string, source: 'cosmos' | 'recent'): DebrisObject[] => {
    const lines = tleData.trim().split('\n');
    const objects: DebrisObject[] = [];
    
    for (let i = 0; i < lines.length; i += 3) {
      if (i + 2 < lines.length) {
        const name = lines[i].trim();
        const line1 = lines[i + 1];
        const line2 = lines[i + 2];
        
        try {
          const noradId = line1.substring(2, 7).trim();
          const satrec = window.satellite?.twoline2satrec(line1, line2);
          
          if (satrec) {
            let category = 'Unknown';
            let country = 'Unknown';
            
            if (name.includes('DEB') || name.includes('DEBRIS')) {
              category = 'Debris';
            } else if (name.includes('R/B') || name.includes('ROCKET')) {
              category = 'Rocket Body';
            } else if (name.includes('COSMOS') || name.includes('SATELLITE')) {
              category = 'Satellite';
            } else if (name.includes('STARLINK')) {
              category = 'Satellite';
              country = 'USA';
            } else if (name.includes('ONEWEB')) {
              category = 'Satellite';
              country = 'UK';
            }
            
            const epochYear = parseInt(line1.substring(18, 20));
            const fullYear = epochYear < 57 ? 2000 + epochYear : 1900 + epochYear;
            
            objects.push({
              name,
              noradId,
              satrec,
              positions: [],
              currentPos: { x: 0, y: 0, lat: 0, lon: 0 },
              category,
              launchDate: fullYear.toString(),
              country
            });
          }
        } catch (err) {
          console.warn('Error parsing TLE for', name, err);
        }
      }
    }
    
    const debris = objects.filter(obj => obj.category === 'Debris').slice(0, 12);
    const satellites = objects.filter(obj => obj.category === 'Satellite').slice(0, 10);
    const rocketBodies = objects.filter(obj => obj.category === 'Rocket Body').slice(0, 6);
    
    return [...debris, ...satellites, ...rocketBodies].slice(0, 25);
  };

  const generateSimulatedDebris = (source: 'cosmos' | 'recent'): DebrisObject[] => {
    const simulated: DebrisObject[] = [];
    
    if (source === 'cosmos') {
      for (let i = 1; i <= 12; i++) {
        simulated.push({
          name: `COSMOS 2251 DEB ${i}`,
          noradId: `4000${i}`,
          satrec: null,
          positions: [],
          currentPos: { x: 0, y: 0, lat: 0, lon: 0 },
          category: 'Debris',
          launchDate: '2009',
          country: 'Russia'
        });
      }
    } else {
      const categories = ['Satellite', 'Debris', 'Rocket Body'];
      const countries = ['USA', 'China', 'Russia', 'India', 'Japan', 'ESA'];
      
      for (let i = 1; i <= 18; i++) {
        const category = categories[i % categories.length];
        simulated.push({
          name: `SIMULATED ${category.toUpperCase()} ${i}`,
          noradId: `5000${i}`,
          satrec: null,
          positions: [],
          currentPos: { x: 0, y: 0, lat: 0, lon: 0 },
          category,
          launchDate: '2024',
          country: countries[i % countries.length]
        });
      }
    }
    
    return simulated;
  };

  const generatePredictionData = (): PredictionData[] => {
    const predictions: PredictionData[] = [];
    const baseYear = 2000;
    const currentDebris = stats.debris || 50;
    
    for (let year = baseYear; year <= 2028; year++) {
      const yearOffset = year - baseYear;
      
      // Historical and projected growth
      let growthRate = 1.05; // 5% base growth
      if (year >= 2007) growthRate = 1.08; // Chinese ASAT test impact
      if (year >= 2009) growthRate = 1.12; // Cosmos-Iridium collision
      if (year >= 2020) growthRate = 1.15; // Mega-constellation era
      if (year >= 2025) growthRate = 1.18; // Projected acceleration
      
      const totalDebris = Math.round(20 * Math.pow(growthRate, yearOffset));
      const largeDebris = Math.round(totalDebris * 0.3);
      const smallDebris = totalDebris - largeDebris;
      
      // Collision events increase with debris density
      const collisionEvents = Math.max(0, Math.round((totalDebris / 1000) * (year >= 2009 ? 2 : 1)));
      
      // Risk assessment
      let riskLevel: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
      if (totalDebris > 500) riskLevel = 'Medium';
      if (totalDebris > 1500) riskLevel = 'High';
      if (totalDebris > 3000) riskLevel = 'Critical';
      
      predictions.push({
        year,
        totalDebris,
        largeDebris,
        smallDebris,
        collisionEvents,
        riskLevel
      });
    }
    
    return predictions;
  };

  const renderPredictionChart = () => {
    if (!predictionChartRef.current || predictionData.length === 0) return;
    
    const canvas = predictionChartRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const padding = 50;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;
    
    const years = predictionData.map(d => d.year);
    const maxDebris = Math.max(...predictionData.map(d => d.totalDebris));
    
    // Draw grid
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = padding + (i / 10) * chartHeight;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(canvas.width - padding, y);
      ctx.stroke();
    }
    
    // Draw total debris line
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    predictionData.forEach((data, index) => {
      const x = padding + (index / (predictionData.length - 1)) * chartWidth;
      const y = canvas.height - padding - (data.totalDebris / maxDebris) * chartHeight;
      
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Draw large debris line
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    predictionData.forEach((data, index) => {
      const x = padding + (index / (predictionData.length - 1)) * chartWidth;
      const y = canvas.height - padding - (data.largeDebris / maxDebris) * chartHeight;
      
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Highlight critical events
    const criticalYears = [2007, 2009, 2020];
    criticalYears.forEach(year => {
      const dataIndex = predictionData.findIndex(d => d.year === year);
      if (dataIndex !== -1) {
        const x = padding + (dataIndex / (predictionData.length - 1)) * chartWidth;
        
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, canvas.height - padding);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Event labels
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        let label = '';
        if (year === 2007) label = 'Chinese ASAT';
        if (year === 2009) label = 'Cosmos-Iridium';
        if (year === 2020) label = 'Mega-constellations';
        ctx.fillText(label, x, padding - 10);
      }
    });
    
    // Year labels
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    years.forEach((year, index) => {
      if (index % 3 === 0) {
        const x = padding + (index / (predictionData.length - 1)) * chartWidth;
        ctx.fillText(year.toString(), x, canvas.height - padding + 20);
      }
    });
    
    // Title and legend
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Space Debris Growth Prediction (2000-2028)', canvas.width / 2, 25);
    
    // Legend
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(padding, 45);
    ctx.lineTo(padding + 20, 45);
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Total Debris', padding + 25, 50);
    
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding + 120, 45);
    ctx.lineTo(padding + 140, 45);
    ctx.stroke();
    ctx.fillText('Large Debris (&gt;10cm)', padding + 145, 50);
  };

  const calculatePosition = (obj: DebrisObject, date: Date) => {
    if (obj.satrec && window.satellite) {
      try {
        const positionAndVelocity = window.satellite.propagate(obj.satrec, date);
        const positionEci = positionAndVelocity.position;
        
        if (positionEci && typeof positionEci.x === 'number') {
          const gmst = window.satellite.gstime(date);
          const positionGd = window.satellite.eciToGeodetic(positionEci, gmst);
          
          const lat = window.satellite.degreesLat(positionGd.latitude);
          const lon = window.satellite.degreesLong(positionGd.longitude);
          
          return { lat, lon };
        }
      } catch (err) {
        console.warn('Error calculating position for', obj.name, err);
      }
    }
    
    // Enhanced fallback simulation
    const time = date.getTime() / 1000;
    const baseSpeed = 0.001;
    const orbitRadius = 150 + (parseInt(obj.noradId) % 100);
    const phase = (parseInt(obj.noradId) % 360) * (Math.PI / 180);
    
    let speedMultiplier = 1;
    let inclinationFactor = 1;
    
    if (obj.category === 'Debris') {
      speedMultiplier = 1.3;
      inclinationFactor = 1.8;
    } else if (obj.category === 'Satellite') {
      speedMultiplier = 0.7;
      inclinationFactor = 0.6;
    }
    
    const lat = Math.sin(time * baseSpeed * speedMultiplier + phase) * 50 * inclinationFactor;
    const lon = ((time * baseSpeed * speedMultiplier * 2.5 + phase) % (2 * Math.PI)) * (180 / Math.PI) - 180;
    
    return { lat, lon };
  };

  const latLonToXY = (lat: number, lon: number, width: number, height: number) => {
    const earthRadius = Math.min(width, height) * 0.35;
    const centerX = width / 2;
    const centerY = height / 2;
    
    const x = centerX + (lon / 180) * earthRadius;
    const y = centerY - (lat / 90) * earthRadius;
    
    return { x, y };
  };

  const getObjectColor = (category: string) => {
    switch (category) {
      case 'Debris':
        return { r: 255, g: 80, b: 80 };
      case 'Satellite':
        return { r: 80, g: 255, b: 80 };
      case 'Rocket Body':
        return { r: 255, g: 180, b: 0 };
      default:
        return { r: 255, g: 255, b: 255 };
    }
  };

  useEffect(() => {
    const loadSatelliteJS = async () => {
      if (!window.satellite) {
        try {
          const satellite = await import('satellite.js');
          window.satellite = satellite;
        } catch (err) {
          console.error('Error loading satellite.js:', err);
          setError('Unable to load orbital calculation library.');
          return;
        }
      }
      
      const objects = await fetchTLEData(dataSource);
      setDebrisObjects(objects);
      
      const debris = objects.filter(obj => obj.category === 'Debris').length;
      const satellites = objects.filter(obj => obj.category === 'Satellite').length;
      const rocketBodies = objects.filter(obj => obj.category === 'Rocket Body').length;
      
      setStats({ 
        total: objects.length, 
        active: objects.length, 
        debris, 
        satellites, 
        rocketBodies 
      });
      setLastUpdate(new Date());
      setIsLoading(false);
      
      // Generate prediction data
      const predictions = generatePredictionData();
      setPredictionData(predictions);
    };

    loadSatelliteJS();
  }, [dataSource]);

  useEffect(() => {
    if (!containerRef.current || isLoading || debrisObjects.length === 0) return;

    const sketch = (p: any) => {
      let canvas: any;
      
      p.setup = () => {
        const container = containerRef.current!;
        const width = container.offsetWidth;
        const height = container.offsetHeight;
        
        canvas = p.createCanvas(width, height);
        canvas.parent(container);
        
        p.frameRate(30);
      };

      p.draw = () => {
        p.background(8, 12, 25);
        
        const now = new Date();
        const centerX = p.width / 2;
        const centerY = p.height / 2;
        const earthRadius = Math.min(p.width, p.height) * 0.35;
        
        // Enhanced Earth rendering
        drawEarth(p, centerX, centerY, earthRadius);
        
        // Update and draw debris objects
        const updatedObjects = debrisObjects.map(obj => {
          const pos = calculatePosition(obj, now);
          const { x, y } = latLonToXY(pos.lat, pos.lon, p.width, p.height);
          
          const newPosition = { x, y, lat: pos.lat, lon: pos.lon, timestamp: now.getTime() };
          obj.positions.push(newPosition);
          
          const cutoffTime = now.getTime() - 90000; // 90 seconds
          obj.positions = obj.positions.filter(pos => pos.timestamp > cutoffTime);
          
          obj.currentPos = { x, y, lat: pos.lat, lon: pos.lon };
          
          return obj;
        });
        
        // Draw enhanced orbit trails
        updatedObjects.forEach(obj => {
          if (obj.positions.length > 1) {
            const color = getObjectColor(obj.category);
            
            for (let i = 1; i < obj.positions.length; i++) {
              const alpha = (i / obj.positions.length) * 120;
              const thickness = (i / obj.positions.length) * 2;
              
              p.stroke(color.r, color.g, color.b, alpha);
              p.strokeWeight(thickness);
              p.line(obj.positions[i-1].x, obj.positions[i-1].y, obj.positions[i].x, obj.positions[i].y);
            }
          }
        });
        
        // Draw enhanced debris objects
        let hoveredObject: TooltipData | null = null;
        
        updatedObjects.forEach(obj => {
          const distance = p.dist(p.mouseX, p.mouseY, obj.currentPos.x, obj.currentPos.y);
          const isHovered = distance < 20;
          
          if (isHovered) {
            hoveredObject = {
              name: obj.name,
              noradId: obj.noradId,
              lat: obj.currentPos.lat,
              lon: obj.currentPos.lon,
              x: p.mouseX,
              y: p.mouseY,
              category: obj.category,
              launchDate: obj.launchDate,
              country: obj.country
            };
          }
          
          const color = getObjectColor(obj.category);
          
          p.push();
          if (isHovered) {
            // Enhanced hover effect
            p.drawingContext.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.9)`;
            p.drawingContext.shadowBlur = 20;
            
            p.fill(255, 255, 255);
            p.stroke(color.r, color.g, color.b);
            p.strokeWeight(3);
            p.ellipse(obj.currentPos.x, obj.currentPos.y, 18);
            
            p.fill(color.r, color.g, color.b);
            p.ellipse(obj.currentPos.x, obj.currentPos.y, 12);
          } else {
            p.drawingContext.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.6)`;
            p.drawingContext.shadowBlur = 8;
            
            p.fill(color.r, color.g, color.b, 240);
            p.noStroke();
            p.ellipse(obj.currentPos.x, obj.currentPos.y, 8);
          }
          p.drawingContext.shadowBlur = 0;
          p.pop();
        });
        
        setTooltip(hoveredObject);
      };

      const drawEarth = (p: any, centerX: number, centerY: number, radius: number) => {
        // Atmosphere layers
        for (let i = 0; i < 4; i++) {
          const layerRadius = radius + 8 + i * 6;
          const alpha = 40 - i * 8;
          p.fill(100, 150, 255, alpha);
          p.noStroke();
          p.ellipse(centerX, centerY, layerRadius * 2);
        }
        
        // Earth body with gradient
        p.drawingContext.shadowColor = 'rgba(50, 150, 255, 0.4)';
        p.drawingContext.shadowBlur = 25;
        
        p.fill(30, 120, 200);
        p.stroke(80, 160, 255);
        p.strokeWeight(2);
        p.ellipse(centerX, centerY, radius * 2);
        
        // Continents
        p.fill(50, 150, 50, 150);
        p.noStroke();
        const time = p.millis() * 0.0001;
        for (let i = 0; i < 15; i++) {
          const angle = time + (i * Math.PI / 7.5);
          const x = centerX + Math.cos(angle) * radius * 0.7;
          const y = centerY + Math.sin(angle) * radius * 0.7;
          const size = 12 + Math.sin(angle * 3) * 4;
          p.ellipse(x, y, size, size * 0.7);
        }
        
        p.drawingContext.shadowBlur = 0;
      };

      p.windowResized = () => {
        if (containerRef.current) {
          p.resizeCanvas(containerRef.current.offsetWidth, containerRef.current.offsetHeight);
        }
      };
    };

    p5InstanceRef.current = new window.p5(sketch);

    return () => {
      if (p5InstanceRef.current) {
        p5InstanceRef.current.remove();
      }
    };
  }, [debrisObjects, isLoading]);

  useEffect(() => {
    if (showPredictions && predictionData.length > 0) {
      setTimeout(() => renderPredictionChart(), 100);
    }
  }, [showPredictions, predictionData]);

  const handleRefresh = () => {
    setIsLoading(true);
    fetchTLEData(dataSource).then(objects => {
      setDebrisObjects(objects);
      
      const debris = objects.filter(obj => obj.category === 'Debris').length;
      const satellites = objects.filter(obj => obj.category === 'Satellite').length;
      const rocketBodies = objects.filter(obj => obj.category === 'Rocket Body').length;
      
      setStats({ 
        total: objects.length, 
        active: objects.length, 
        debris, 
        satellites, 
        rocketBodies 
      });
      setLastUpdate(new Date());
      setIsLoading(false);
    });
  };

  const handleDataSourceChange = (source: 'cosmos' | 'recent') => {
    setDataSource(source);
  };

  return (
    <div className="min-h-screen pt-16">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {dataSource === 'cosmos' ? 'COSMOS 2251 Debris' : 'Recent Space Objects'} Simulation
              </h1>
              <p className="text-gray-300">Real-time orbital visualization with predictive analytics</p>
            </div>
            
            <div className="mt-4 lg:mt-0 flex flex-col lg:flex-row items-start lg:items-center space-y-4 lg:space-y-0 lg:space-x-6">
              {/* Data Source Toggle */}
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-purple-400" />
                <select
                  value={dataSource}
                  onChange={(e) => handleDataSourceChange(e.target.value as 'cosmos' | 'recent')}
                  className="bg-gray-800 text-white border border-gray-600 rounded px-3 py-1 text-sm"
                >
                  <option value="recent">Last 30 Days</option>
                  <option value="cosmos">COSMOS 2251 Debris</option>
                </select>
              </div>
              
              {/* Prediction Toggle */}
              <button
                onClick={() => setShowPredictions(!showPredictions)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                  showPredictions 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Future Predictions</span>
              </button>
              
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Satellite className="w-4 h-4 text-blue-400" />
                  <span className="text-gray-300">Total: {stats.total}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <span className="text-gray-300">Debris: {stats.debris}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-gray-300">Satellites: {stats.satellites}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-green-400" />
                  <span className="text-gray-300">
                    {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
                  </span>
                </div>
              </div>
              
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors duration-200"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Prediction Modal */}
      {showPredictions && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/20 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center">
                  <Calendar className="w-6 h-6 mr-2 text-blue-400" />
                  Space Debris Future Predictions (2000-2028)
                </h2>
                <button
                  onClick={() => setShowPredictions(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="mb-6">
                <canvas
                  ref={predictionChartRef}
                  width={800}
                  height={400}
                  className="w-full h-auto bg-gray-800 rounded-lg"
                />
              </div>
              
              {predictionData.length > 0 && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Key Predictions for 2028</h3>
                    <div className="space-y-3">
                      <div className="bg-red-600/20 rounded-lg p-4">
                        <div className="text-red-400 text-sm font-medium">Total Debris Objects</div>
                        <div className="text-white text-2xl font-bold">
                          {predictionData[predictionData.length - 1]?.totalDebris.toLocaleString()}
                        </div>
                        <div className="text-gray-300 text-xs">
                          {((predictionData[predictionData.length - 1]?.totalDebris / predictionData[0]?.totalDebris - 1) * 100).toFixed(0)}% increase from 2000
                        </div>
                      </div>
                      
                      <div className="bg-yellow-600/20 rounded-lg p-4">
                        <div className="text-yellow-400 text-sm font-medium">Large Debris (&gt;10cm)</div>
                        <div className="text-white text-2xl font-bold">
                          {predictionData[predictionData.length - 1]?.largeDebris.toLocaleString()}
                        </div>
                        <div className="text-gray-300 text-xs">Trackable by ground radar</div>
                      </div>
                      
                      <div className="bg-orange-600/20 rounded-lg p-4">
                        <div className="text-orange-400 text-sm font-medium">Risk Level</div>
                        <div className={`text-2xl font-bold ${
                          predictionData[predictionData.length - 1]?.riskLevel === 'Critical' ? 'text-red-400' :
                          predictionData[predictionData.length - 1]?.riskLevel === 'High' ? 'text-orange-400' :
                          predictionData[predictionData.length - 1]?.riskLevel === 'Medium' ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                          {predictionData[predictionData.length - 1]?.riskLevel}
                        </div>
                        <div className="text-gray-300 text-xs">Collision probability assessment</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Critical Events Timeline</h3>
                    <div className="space-y-3 text-sm">
                      <div className="border-l-4 border-red-400 pl-4">
                        <div className="text-white font-medium">2007 - Chinese ASAT Test</div>
                        <div className="text-gray-300">Destroyed Fengyun-1C satellite, creating 3,000+ debris pieces</div>
                      </div>
                      
                      <div className="border-l-4 border-red-400 pl-4">
                        <div className="text-white font-medium">2009 - Cosmos-Iridium Collision</div>
                        <div className="text-gray-300">First major satellite collision, doubled tracked debris</div>
                      </div>
                      
                      <div className="border-l-4 border-blue-400 pl-4">
                        <div className="text-white font-medium">2020 - Mega-Constellation Era</div>
                        <div className="text-gray-300">Starlink and other constellations accelerate object growth</div>
                      </div>
                      
                      <div className="border-l-4 border-yellow-400 pl-4">
                        <div className="text-white font-medium">2025-2028 - Critical Period</div>
                        <div className="text-gray-300">Projected exponential growth without intervention</div>
                      </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-blue-600/20 rounded-lg">
                      <h4 className="text-blue-400 font-medium mb-2">Mitigation Strategies</h4>
                      <ul className="text-gray-300 text-sm space-y-1">
                        <li>• Active Debris Removal (ADR) missions</li>
                        <li>• Post-mission disposal guidelines</li>
                        <li>• Collision avoidance systems</li>
                        <li>• International space traffic management</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 relative">
        {error && (
          <div className="absolute top-4 left-4 right-4 z-10 bg-orange-600/20 backdrop-blur-sm border border-orange-400/30 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <Info className="w-5 h-5 text-orange-400" />
              <span className="text-orange-200">{error}</span>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-8 text-center">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
              <p className="text-white text-lg font-medium">Loading orbital data...</p>
              <p className="text-gray-300 text-sm mt-2">
                Fetching {dataSource === 'cosmos' ? 'COSMOS 2251 debris' : 'recent launches'} TLE data from NORAD
              </p>
            </div>
          </div>
        )}

        {/* Enhanced Tooltip */}
        {tooltip && (
          <div
            className="absolute z-20 bg-black/90 backdrop-blur-sm border border-white/20 rounded-lg p-4 text-white text-sm pointer-events-none max-w-xs"
            style={{
              left: tooltip.x + 15,
              top: tooltip.y - 10,
              transform: 'translateY(-100%)'
            }}
          >
            <div className="font-bold text-blue-400 mb-2">{tooltip.name}</div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">NORAD ID:</span>
                <span>{tooltip.noradId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Category:</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  tooltip.category === 'Debris' ? 'bg-red-600' :
                  tooltip.category === 'Satellite' ? 'bg-green-600' :
                  tooltip.category === 'Rocket Body' ? 'bg-yellow-600' : 'bg-gray-600'
                }`}>
                  {tooltip.category}
                </span>
              </div>
              {tooltip.launchDate && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Launch Year:</span>
                  <span>{tooltip.launchDate}</span>
                </div>
              )}
              {tooltip.country && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Country:</span>
                  <span>{tooltip.country}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-white/20">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span>{tooltip.lat.toFixed(2)}°, {tooltip.lon.toFixed(2)}°</span>
              </div>
            </div>
          </div>
        )}

        {/* Canvas Container */}
        <div 
          ref={containerRef} 
          className="w-full"
          style={{ height: 'calc(100vh - 140px)' }}
        />

        {/* Enhanced Legend */}
        <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm border border-white/20 rounded-lg p-4">
          <h3 className="text-white font-bold mb-3 flex items-center">
            <Globe className="w-5 h-5 mr-2 text-blue-400" />
            Legend & Info
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-blue-400 rounded-full opacity-60"></div>
              <span className="text-gray-300">Earth with Atmosphere</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <span className="text-gray-300">Space Debris</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <span className="text-gray-300">Active Satellites</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <span className="text-gray-300">Rocket Bodies</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-1 bg-gradient-to-r from-transparent to-red-400 opacity-50"></div>
              <span className="text-gray-300">Orbit Trail (90s)</span>
            </div>
          </div>
        </div>

        {/* Enhanced Instructions */}
        <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm border border-white/20 rounded-lg p-4 max-w-xs">
          <h3 className="text-white font-bold mb-2 flex items-center">
            <Zap className="w-5 h-5 mr-2 text-yellow-400" />
            Interactive Features
          </h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Hover over objects for detailed satellite info</li>
            <li>• Enhanced trails show 90-second orbital paths</li>
            <li>• Switch between data sources in header</li>
            <li>• Click "Future Predictions" for 2028 projections</li>
            <li>• Real-time data updates from NORAD TLE</li>
          </ul>
          
          <div className="mt-3 pt-3 border-t border-white/20">
            <p className="text-xs text-gray-400">
              <strong>Current:</strong> {dataSource === 'cosmos' ? 'COSMOS 2251 collision debris' : 'Objects launched in last 30 days'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              <strong>Prediction Model:</strong> Based on historical growth patterns and collision events
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebrisSimulation;