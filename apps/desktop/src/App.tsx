import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';

interface CaptureResult {
  ok: boolean;
  reason: string | null;
  window_title: string | null;
  roi_path: string | null;
  tooltip_path: string | null;
  tooltip_rect: [number, number, number, number] | null;
  tooltip_confidence: number | null;
  elapsed_ms: number;
}

interface LogEntry extends CaptureResult {
  at: string;
}

export default function App() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const latest = log[0];

  useEffect(() => {
    const un = listen<CaptureResult>('valetrade://capture', (e) => {
      setLog((prev) => [{ ...e.payload, at: new Date().toLocaleTimeString() }, ...prev].slice(0, 20));
    });
    return () => {
      un.then((f) => f());
    };
  }, []);

  const preview = latest?.tooltip_path ?? latest?.roi_path ?? null;

  return (
    <main className="app">
      <header>
        <h1>ValeTrade Companion</h1>
        <span className="tag">Phase 2 POC</span>
      </header>

      <section className="hint">
        在 SpiritVale 裡把滑鼠移到物品上，按 <kbd>F8</kbd> 擷取 tooltip。
        <button onClick={() => invoke('trigger_capture')}>手動測試擷取</button>
      </section>

      {latest && (
        <section className={`result ${latest.ok ? 'ok' : 'fail'}`}>
          <div className="row">
            <b>{latest.ok ? '擷取成功' : '已拒絕'}</b>
            <span>{latest.elapsed_ms}ms</span>
          </div>
          {latest.reason && <div className="reason">{latest.reason}</div>}
          {latest.tooltip_confidence != null && (
            <div className="row">
              <span>Tooltip 偵測信心</span>
              <b>{Math.round(latest.tooltip_confidence * 100)}%</b>
            </div>
          )}
          {preview && (
            <img className="preview" src={convertFileSrc(preview)} alt="capture preview" />
          )}
          <div className="privacy">僅擷取游標周圍區域，檔案只存在本機，不會自動上傳。</div>
        </section>
      )}

      <section className="log">
        {log.map((l, i) => (
          <div key={i} className="logline">
            <span>{l.at}</span>
            <span>{l.ok ? (l.tooltip_path ? 'tooltip ✓' : 'ROI only') : '拒絕'}</span>
            <span>{l.elapsed_ms}ms</span>
          </div>
        ))}
      </section>
    </main>
  );
}
