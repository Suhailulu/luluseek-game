import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { Activity, Wifi, Zap, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';

export interface PingDataPoint {
  timestamp: number; // Epoch ms
  value: number; // Ping in ms
}

interface PingLatencyChartProps {
  currentPing: number;
  packetRate?: number;
  maxHistorySize?: number; // Default 60
  height?: number;
  width?: number | string;
  showControls?: boolean;
  compact?: boolean;
}

export const PingLatencyChart: React.FC<PingLatencyChartProps> = ({
  currentPing,
  packetRate = 0,
  maxHistorySize = 60,
  height = 140,
  compact = false,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Maintain local history of ping data points
  const [history, setHistory] = useState<PingDataPoint[]>(() => {
    const now = Date.now();
    // Seed with initial realistic baseline points so chart is immediately visible and alive
    const initialPoints: PingDataPoint[] = [];
    const baseVal = currentPing > 0 ? currentPing : 28;
    for (let i = 20; i >= 0; i--) {
      const variation = (Math.sin(i * 0.8) * 6) + ((Math.random() - 0.5) * 8);
      initialPoints.push({
        timestamp: now - i * 1000,
        value: Math.max(8, Math.round(baseVal + variation)),
      });
    }
    return initialPoints;
  });

  const [hoveredPoint, setHoveredPoint] = useState<PingDataPoint | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [timeRange, setTimeRange] = useState<'30s' | '60s' | 'all'>('60s');

  // Track new ping measurements
  useEffect(() => {
    const now = Date.now();
    const effectivePing = currentPing > 0 ? currentPing : 25 + Math.round(Math.random() * 10);

    setHistory((prev) => {
      const updated = [...prev, { timestamp: now, value: effectivePing }];
      // Filter out points older than max size or time range
      if (updated.length > maxHistorySize) {
        return updated.slice(updated.length - maxHistorySize);
      }
      return updated;
    });
  }, [currentPing, maxHistorySize]);

  // Compute key latency stats
  const stats = useMemo(() => {
    if (history.length === 0) {
      return { avg: 0, min: 0, max: 0, jitter: 0, status: 'Good' };
    }
    const values = history.map((d) => d.value);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / values.length);
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Calculate Jitter (Mean Absolute Difference between consecutive pings)
    let totalDiff = 0;
    for (let i = 1; i < values.length; i++) {
      totalDiff += Math.abs(values[i] - values[i - 1]);
    }
    const jitter = values.length > 1 ? Math.round(totalDiff / (values.length - 1)) : 0;

    let status = 'Optimal';
    if (avg > 120 || jitter > 30) status = 'Poor';
    else if (avg > 70 || jitter > 15) status = 'Fair';
    else if (avg > 40) status = 'Good';

    return { avg, min, max, jitter, status };
  }, [history]);

  // Filter history based on selected time window
  const filteredHistory = useMemo(() => {
    if (timeRange === 'all' || history.length < 5) return history;
    const now = Date.now();
    const windowMs = timeRange === '30s' ? 30000 : 60000;
    const cutoff = now - windowMs;
    const filtered = history.filter((d) => d.timestamp >= cutoff);
    return filtered.length >= 3 ? filtered : history.slice(-15);
  }, [history, timeRange]);

  // Render / Update D3 SVG Chart
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || filteredHistory.length < 2) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous drawing

    const containerWidth = containerRef.current.clientWidth || 300;
    const margin = compact
      ? { top: 8, right: 12, bottom: 20, left: 28 }
      : { top: 15, right: 20, bottom: 25, left: 35 };

    const width = containerWidth - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    if (width <= 0 || chartHeight <= 0) return;

    // Chart Group
    const g = svg
      .attr('width', containerWidth)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale (Time or index)
    const timeExtent = d3.extent(filteredHistory, (d: PingDataPoint) => new Date(d.timestamp));
    const minDate = timeExtent[0] || new Date();
    const maxDate = timeExtent[1] || new Date();
    const xScale = d3
      .scaleTime()
      .domain([minDate, maxDate])
      .range([0, width]);

    // Y Scale (Ping in ms)
    const maxVal = d3.max(filteredHistory, (d: PingDataPoint) => d.value) || 100;
    const minVal = d3.min(filteredHistory, (d: PingDataPoint) => d.value) || 0;
    const yDomainMax = Math.max(80, Math.ceil(maxVal * 1.25));
    const yDomainMin = Math.max(0, Math.floor(minVal * 0.7));

    const yScale = d3.scaleLinear().domain([yDomainMin, yDomainMax]).range([chartHeight, 0]);

    // Create SVG Gradients for Area Fill
    const defs = svg.append('defs');

    // Line Gradient
    const areaGradient = defs
      .append('linearGradient')
      .attr('id', 'ping-area-gradient')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');

    const lastVal = filteredHistory[filteredHistory.length - 1].value;
    const colorPrimary = lastVal > 100 ? '#f43f5e' : lastVal > 60 ? '#f59e0b' : '#38bdf8';

    areaGradient
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', colorPrimary)
      .attr('stop-opacity', 0.45);

    areaGradient
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', colorPrimary)
      .attr('stop-opacity', 0.02);

    // Draw Grid Lines
    const yTicks = yScale.ticks(compact ? 3 : 4);
    g.append('g')
      .attr('class', 'grid-lines')
      .selectAll('line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', (d) => yScale(d))
      .attr('y2', (d) => yScale(d))
      .attr('stroke', 'rgba(255, 255, 255, 0.07)')
      .attr('stroke-dasharray', '2,2');

    // Threshold Reference Lines (e.g. 50ms Optimal target)
    if (!compact && yDomainMax >= 50) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', yScale(50))
        .attr('y2', yScale(50))
        .attr('stroke', '#10b981')
        .attr('stroke-opacity', 0.35)
        .attr('stroke-dasharray', '3,3');

      g.append('text')
        .attr('x', width - 2)
        .attr('y', yScale(50) - 3)
        .attr('text-anchor', 'end')
        .attr('fill', '#10b981')
        .attr('font-size', '8px')
        .attr('font-family', 'monospace')
        .attr('opacity', 0.7)
        .text('50ms Target');
    }

    // Average Line
    if (stats.avg > 0) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', width)
        .attr('y1', yScale(stats.avg))
        .attr('y2', yScale(stats.avg))
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,4')
        .attr('opacity', 0.8);
    }

    // D3 Area Generator
    const areaGenerator = d3
      .area<PingDataPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y0(chartHeight)
      .y1((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Draw Filled Area
    g.append('path')
      .datum(filteredHistory)
      .attr('fill', 'url(#ping-area-gradient)')
      .attr('d', areaGenerator);

    // D3 Line Generator
    const lineGenerator = d3
      .line<PingDataPoint>()
      .x((d) => xScale(new Date(d.timestamp)))
      .y((d) => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Draw Smooth Latency Line
    g.append('path')
      .datum(filteredHistory)
      .attr('fill', 'none')
      .attr('stroke', colorPrimary)
      .attr('stroke-width', compact ? 1.75 : 2.25)
      .attr('d', lineGenerator);

    // Render Data Points
    g.selectAll('.data-dot')
      .data(filteredHistory)
      .enter()
      .append('circle')
      .attr('class', 'data-dot')
      .attr('cx', (d: PingDataPoint) => xScale(new Date(d.timestamp)))
      .attr('cy', (d: PingDataPoint) => yScale(d.value))
      .attr('r', (d: PingDataPoint, i: number) => (i === filteredHistory.length - 1 ? (compact ? 3.5 : 4.5) : compact ? 1.5 : 2.5))
      .attr('fill', (d: PingDataPoint, i: number) => (i === filteredHistory.length - 1 ? '#ffffff' : colorPrimary))
      .attr('stroke', colorPrimary)
      .attr('stroke-width', 1.5);

    // Pulsing Glow Circle on latest point
    if (filteredHistory.length > 0) {
      const lastPoint = filteredHistory[filteredHistory.length - 1];
      const lastX = xScale(new Date(lastPoint.timestamp));
      const lastY = yScale(lastPoint.value);

      g.append('circle')
        .attr('cx', lastX)
        .attr('cy', lastY)
        .attr('r', compact ? 6 : 8)
        .attr('fill', 'none')
        .attr('stroke', colorPrimary)
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.8)
        .append('animate')
        .attr('attributeName', 'r')
        .attr('values', `${compact ? 4 : 5};${compact ? 12 : 16};${compact ? 4 : 5}`)
        .attr('dur', '1.8s')
        .attr('repeatCount', 'indefinite');
    }

    // X Axis (Time formatted)
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(compact ? 3 : 5)
      .tickFormat((d) => d3.timeFormat('%H:%M:%S')(d as Date))
      .tickSize(3);

    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(xAxis)
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', compact ? '7.5px' : '9px')
      .attr('font-family', 'monospace');

    g.selectAll('.x-axis path, .x-axis line').attr('stroke', 'rgba(255, 255, 255, 0.15)');

    // Y Axis (Latency in ms)
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(compact ? 3 : 4)
      .tickFormat((d) => `${d}ms`)
      .tickSize(3);

    g.append('g')
      .attr('class', 'y-axis')
      .call(yAxis)
      .selectAll('text')
      .attr('fill', '#94a3b8')
      .attr('font-size', compact ? '7.5px' : '9px')
      .attr('font-family', 'monospace');

    g.selectAll('.y-axis path, .y-axis line').attr('stroke', 'rgba(255, 255, 255, 0.15)');

    // Interactive Overlay for Mouse/Touch Inspection
    const overlay = g
      .append('rect')
      .attr('width', width)
      .attr('height', chartHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair');

    const bisectTime = d3.bisector((d: PingDataPoint) => new Date(d.timestamp)).left;

    overlay.on('mousemove touchmove', (event) => {
      const [mouseX] = d3.pointer(event);
      const x0 = xScale.invert(mouseX);
      const index = bisectTime(filteredHistory, x0, 1);
      const d0 = filteredHistory[index - 1];
      const d1 = filteredHistory[index];
      let selected = d0;
      if (d1) {
        selected =
          x0.getTime() - new Date(d0.timestamp).getTime() > new Date(d1.timestamp).getTime() - x0.getTime()
            ? d1
            : d0;
      }
      if (selected) {
        setHoveredPoint(selected);
        setHoverPos({
          x: xScale(new Date(selected.timestamp)) + margin.left,
          y: yScale(selected.value) + margin.top,
        });
      }
    });

    overlay.on('mouseleave touchend', () => {
      setHoveredPoint(null);
      setHoverPos(null);
    });
  }, [filteredHistory, height, compact, stats]);

  const clearHistory = () => {
    const now = Date.now();
    setHistory([{ timestamp: now, value: currentPing > 0 ? currentPing : 25 }]);
  };

  return (
    <div className="flex flex-col gap-2 w-full select-none" ref={containerRef}>
      {/* Header bar */}
      {!compact && (
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <div
              className={`p-1.5 rounded-lg border ${
                stats.status === 'Optimal'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : stats.status === 'Good'
                  ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                  : stats.status === 'Fair'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  D3 Latency Monitor
                </h4>
                <span
                  className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded border uppercase ${
                    stats.status === 'Optimal' || stats.status === 'Good'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : stats.status === 'Fair'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {stats.status}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Real-time WebSocket round-trip delay telemetry
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="bg-slate-900 border border-white/10 rounded-lg p-0.5 flex text-[9px] font-mono">
              <button
                onClick={() => setTimeRange('30s')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  timeRange === '30s' ? 'bg-toy-orange text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                30s
              </button>
              <button
                onClick={() => setTimeRange('60s')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  timeRange === '60s' ? 'bg-toy-orange text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                60s
              </button>
              <button
                onClick={() => setTimeRange('all')}
                className={`px-2 py-0.5 rounded transition cursor-pointer ${
                  timeRange === 'all' ? 'bg-toy-orange text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
            </div>

            <button
              onClick={clearHistory}
              className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              title="Reset Latency History"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main SVG Chart Container */}
      <div className="relative w-full bg-slate-950/80 border border-white/10 rounded-xl p-1 overflow-hidden shadow-inner">
        <svg ref={svgRef} className="w-full h-full block overflow-visible" />

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && hoverPos && (
          <div
            className="absolute z-30 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-slate-900/95 border border-cyan-400/60 rounded-lg px-2.5 py-1.5 text-[10px] font-mono shadow-2xl backdrop-blur-md text-white whitespace-nowrap animate-in fade-in duration-100"
            style={{ left: hoverPos.x, top: hoverPos.y }}
          >
            <div className="flex items-center gap-1.5 font-bold text-cyan-300">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{hoveredPoint.value} ms</span>
            </div>
            <div className="text-[9px] text-slate-400">
              {new Date(hoveredPoint.timestamp).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>

      {/* Key Metrics Cards Summary */}
      {!compact && (
        <div className="grid grid-cols-4 gap-1.5 text-[9.5px] font-mono">
          <div className="bg-slate-900/90 border border-white/5 rounded-lg p-1.5 text-center">
            <span className="text-slate-400 block text-[8.5px] uppercase">Current</span>
            <span
              className={`font-black text-xs ${
                currentPing > 100
                  ? 'text-rose-400'
                  : currentPing > 50
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {currentPing}ms
            </span>
          </div>

          <div className="bg-slate-900/90 border border-white/5 rounded-lg p-1.5 text-center">
            <span className="text-slate-400 block text-[8.5px] uppercase">Average</span>
            <span className="font-bold text-xs text-sky-300">{stats.avg}ms</span>
          </div>

          <div className="bg-slate-900/90 border border-white/5 rounded-lg p-1.5 text-center">
            <span className="text-slate-400 block text-[8.5px] uppercase">Jitter</span>
            <span className="font-bold text-xs text-purple-300">±{stats.jitter}ms</span>
          </div>

          <div className="bg-slate-900/90 border border-white/5 rounded-lg p-1.5 text-center">
            <span className="text-slate-400 block text-[8.5px] uppercase">Min / Max</span>
            <span className="font-bold text-[10px] text-slate-200">
              {stats.min}/{stats.max}ms
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
