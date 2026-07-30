import React, { useState, useEffect } from 'react';
import { X, Activity, CheckCircle2, AlertTriangle, ShieldAlert, Copy, Check, Send, BarChart2, Terminal, Radio } from 'lucide-react';
import { getGAStatus, setRuntimeMeasurementId, trackEvent, printConsoleDiagnostics, getRecentEvents, subscribeToEvents, TrackedEventLog } from '../lib/analytics';
import { soundManager } from '../lib/sound';

interface GADiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GADiagnosticsModal: React.FC<GADiagnosticsModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState(getGAStatus());
  const [copied, setCopied] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [customInput, setCustomInput] = useState(status.measurementId || '');
  const [eventsLog, setEventsLog] = useState<TrackedEventLog[]>(getRecentEvents(5));

  useEffect(() => {
    if (isOpen) {
      const current = getGAStatus();
      setStatus(current);
      setCustomInput(current.measurementId || '');
      setEventsLog(getRecentEvents(5));
      printConsoleDiagnostics();

      const unsubscribe = subscribeToEvents(() => {
        setEventsLog(getRecentEvents(5));
      });
      return unsubscribe;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveId = () => {
    soundManager.playClick();
    setRuntimeMeasurementId(customInput);
    const updated = getGAStatus();
    setStatus(updated);
    setTestSent(false);
  };

  const handleSendTestEvent = () => {
    soundManager.playClick();
    trackEvent('diagnostic_test_ping', {
      timestamp: new Date().toISOString(),
      screen: 'diagnostics_modal',
      user_agent: navigator.userAgent
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const copyDiagnostics = () => {
    soundManager.playClick();
    const text = `GA4 Diagnostic Status:\n- Measurement ID: ${status.measurementId || 'None'}\n- VITE_GA_MEASUREMENT_ID: ${status.envId || 'Not set'}\n- Initialized: ${status.isInitialized}\n- gtag Ready: ${status.isGtagReady}\n- Script Load Failed: ${status.scriptLoadFailed}\n\nRecent Events:\n` +
      eventsLog.map(e => `[${e.timestamp}] ${e.type.toUpperCase()}: ${e.name}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white border-4 border-toy-dark rounded-3xl p-5 shadow-[6px_6px_0px_#1e293b] flex flex-col gap-3.5 relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 border-2 border-toy-dark rounded-xl text-emerald-700">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-800 leading-none">Google Analytics 4 Diagnostics</h3>
              <p className="text-[11px] font-bold text-slate-500 mt-0.5">Connection & Real-time Event Feed</p>
            </div>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 border-2 border-toy-dark rounded-xl text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Highlights */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className={`p-2.5 rounded-2xl border-2 border-toy-dark flex flex-col gap-0.5 ${status.isInitialized ? 'bg-emerald-50 text-emerald-950' : 'bg-amber-50 text-amber-950'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-70">Initialization</span>
              {status.isInitialized ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
            </div>
            <span className="text-xs font-black">{status.isInitialized ? 'ACTIVE & CONNECTED' : 'INACTIVE / NOT SET'}</span>
          </div>

          <div className={`p-2.5 rounded-2xl border-2 border-toy-dark flex flex-col gap-0.5 ${status.scriptLoadFailed ? 'bg-rose-50 text-rose-950' : 'bg-blue-50 text-blue-950'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider opacity-70">Network Script</span>
              {status.scriptLoadFailed ? <ShieldAlert className="w-4 h-4 text-rose-600" /> : <Activity className="w-4 h-4 text-blue-600" />}
            </div>
            <span className="text-xs font-black">{status.scriptLoadFailed ? 'BLOCKED (AdBlocker)' : 'LOADED (gtag.js)'}</span>
          </div>
        </div>

        {/* Detailed Diagnostics Table */}
        <div className="bg-slate-900 text-slate-100 p-3 rounded-2xl border-2 border-toy-dark font-mono text-xs space-y-1.5">
          <div className="flex justify-between items-center border-b border-slate-800 pb-1">
            <span className="text-slate-400">VITE_GA_MEASUREMENT_ID:</span>
            <span className={status.envId ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              {status.envId || 'Not set'}
            </span>
          </div>

          <div className="flex justify-between items-center border-b border-slate-800 pb-1">
            <span className="text-slate-400">Active Measurement ID:</span>
            <span className="text-cyan-300 font-bold">{status.measurementId || 'None'}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">window.gtag Ready:</span>
            <span className={status.isGtagReady ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              {status.isGtagReady ? 'true' : 'false'}
            </span>
          </div>
        </div>

        {/* Real-time Session Event Feed (Last 5 Events) */}
        <div className="border-2 border-toy-dark rounded-2xl p-3 bg-slate-50 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-black text-xs text-slate-800 uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Real-time Event Stream (Last 5)</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-300 px-2 py-0.5 rounded-full">
              {eventsLog.length} events logged
            </span>
          </div>

          {eventsLog.length === 0 ? (
            <div className="text-center py-4 text-xs font-bold text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
              No events recorded in this session yet. Trigger an action or send a test ping!
            </div>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {eventsLog.map((evt) => (
                <div key={evt.id} className="bg-white border-2 border-slate-200 rounded-xl p-2 text-xs font-mono flex items-center justify-between gap-2 shadow-sm">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase shrink-0 ${
                      evt.type === 'page_view' ? 'bg-purple-100 text-purple-800 border border-purple-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}>
                      {evt.type}
                    </span>
                    <span className="font-bold text-slate-800 truncate">{evt.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0 font-sans font-bold">{evt.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Measurement ID Configuration / Testing */}
        <div className="bg-slate-50 border-2 border-toy-dark p-2.5 rounded-2xl space-y-1.5">
          <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider">
            Configure / Override Measurement ID
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="G-XXXXXXXXXX"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value.toUpperCase().trim())}
              className="flex-1 bg-white border-2 border-toy-dark px-3 py-1.5 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
            />
            <button
              onClick={handleSaveId}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-black text-xs px-3 py-1.5 rounded-xl border-2 border-toy-dark cursor-pointer transition active:scale-95"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 pt-0.5">
          <button
            onClick={handleSendTestEvent}
            disabled={!status.isInitialized}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border-2 border-toy-dark font-black text-xs transition cursor-pointer shadow-[2px_2px_0px_#1e293b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
              status.isInitialized
                ? 'bg-toy-yellow hover:bg-yellow-300 text-toy-dark'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            {testSent ? 'Sent to GA4 Realtime! ⚡' : 'Send Test Ping to Realtime'}
          </button>

          <button
            onClick={copyDiagnostics}
            className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-100 text-toy-dark border-2 border-toy-dark rounded-xl font-black text-xs transition cursor-pointer shadow-[2px_2px_0px_#1e293b] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Summary'}
          </button>
        </div>
      </div>
    </div>
  );
};
