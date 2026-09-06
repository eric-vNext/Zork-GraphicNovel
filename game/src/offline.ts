// Talking to the service worker about offline downloads.
//
// The assets are grouped per game (see scripts/build-manifest.mjs), so the
// page can offer "download Zork II for offline play" and mean it, rather than
// hoping the right forty megabytes happen to have been fetched while playing.
export interface GroupStatus {
  total: number;
  have: number;
  bytes: number;
}

export type OfflineStatus = Record<string, GroupStatus>;

export const GROUP_TITLES: Record<string, string> = {
  shell: 'Interface',
  zork1: 'Zork I',
  zork2: 'Zork II',
  zork3: 'Zork III',
};

function worker(): Promise<ServiceWorker | null> {
  if (!('serviceWorker' in navigator)) return Promise.resolve(null);
  return navigator.serviceWorker.ready.then((reg) => reg.active).catch(() => null);
}

/** Send one message and wait for the worker's reply. */
async function ask<T>(message: object, timeoutMs = 15000): Promise<T | null> {
  const sw = await worker();
  if (!sw) return null;
  return new Promise<T | null>((resolve) => {
    const channel = new MessageChannel();
    const timer = timeoutMs > 0 ? setTimeout(() => resolve(null), timeoutMs) : null;
    channel.port1.onmessage = (e) => { if (timer) clearTimeout(timer); resolve(e.data as T); };
    sw.postMessage(message, [channel.port2]);
  });
}

export async function offlineStatus(): Promise<OfflineStatus | null> {
  const res = await ask<{ ok: boolean; groups: OfflineStatus }>({ type: 'status' });
  return res?.ok ? res.groups : null;
}

/**
 * Download a group. Progress arrives as worker messages rather than through
 * the reply, because a download of forty megabytes wants reporting as it goes;
 * the returned promise settles when it is finished.
 */
export function downloadGroup(
  group: string,
  onProgress?: (done: number, total: number) => void,
): Promise<{ total: number; failed: number } | null> {
  const listener = (e: MessageEvent) => {
    const d = e.data || {};
    if (d.type === 'precache-progress' && d.group === group) onProgress?.(d.done, d.total);
  };
  navigator.serviceWorker?.addEventListener('message', listener);
  // No timeout: a slow connection may take minutes over tens of megabytes.
  return ask<{ ok: boolean; total: number; failed: number }>({ type: 'precache', group }, 0)
    .then((res) => (res?.ok ? { total: res.total, failed: res.failed } : null))
    .finally(() => navigator.serviceWorker?.removeEventListener('message', listener));
}

export async function evictGroup(group: string): Promise<OfflineStatus | null> {
  const res = await ask<{ ok: boolean; groups: OfflineStatus }>({ type: 'evict', group });
  return res?.ok ? res.groups : null;
}

export const formatMB = (bytes: number): string => `${(bytes / 1e6).toFixed(0)} MB`;
