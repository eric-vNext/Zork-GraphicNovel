import { useEffect, useState } from 'react';
import {
  GROUP_TITLES, formatMB, downloadGroup, evictGroup, offlineStatus,
  type OfflineStatus,
} from '../offline';

/**
 * Offline downloads, one game at a time.
 *
 * Each game's art and audio is about forty megabytes, so the choice is the
 * player's: keep whichever games you actually want to play on a train, and
 * throw the rest away again. Whatever you have already looked at while online
 * stays available regardless — this is about the parts you have not.
 */
export function OfflineModal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<OfflineStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    offlineStatus().then((s) => {
      if (s) setStatus(s);
      else setUnsupported(true);
    });
  }, []);

  async function download(group: string) {
    setBusy(group);
    setProgress(0);
    await downloadGroup(group, (done, total) => setProgress(total ? done / total : 0));
    setStatus(await offlineStatus());
    setBusy(null);
  }

  async function remove(group: string) {
    setBusy(group);
    const next = await evictGroup(group);
    if (next) setStatus(next);
    setBusy(null);
  }

  return (
    <div className="modal-wrap" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Play Offline</h3>
        {unsupported && (
          <p>
            This browser has no service worker, so offline play is not available here.
            The game still works normally while you are online.
          </p>
        )}
        {!unsupported && !status && <p>Checking what is already downloaded…</p>}
        {status && (
          <>
            <p>
              Each game keeps its own artwork and music. Download the ones you want to
              play without a connection; you can remove them again at any time.
            </p>
            <ul className="offline-list">
              {Object.entries(status).map(([group, s]) => {
                const complete = s.have >= s.total;
                const partial = s.have > 0 && !complete;
                const working = busy === group;
                return (
                  <li key={group}>
                    <span className="offline-name">{GROUP_TITLES[group] ?? group}</span>
                    <span className="offline-size">
                      {working
                        ? `${Math.round(progress * 100)}%`
                        : complete
                          ? 'downloaded'
                          : partial
                            ? `${s.have} of ${s.total} files`
                            : formatMB(s.bytes)}
                    </span>
                    {group === 'shell' ? (
                      <span className="offline-size">always kept</span>
                    ) : complete ? (
                      <button disabled={!!busy} onClick={() => remove(group)}>Remove</button>
                    ) : (
                      <button disabled={!!busy} onClick={() => download(group)}>
                        {working ? 'Downloading…' : 'Download'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <div className="btns" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="modal-close" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
