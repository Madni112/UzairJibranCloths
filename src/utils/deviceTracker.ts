import { supabase } from '../Context/supabaseClient';

export interface UserDevice {
  id?: string | number;
  deviceId: string;
  deviceName: string;
  deviceType: string;
  os: string;
  browser: string;
  screen: string;
  ip: string;
  location: string;
  status: 'online' | 'idle' | 'offline';
  lastActive: string; // ISO string
  isCurrent: boolean;
  revoked?: boolean;
  formattedLastActive?: string;
  timeAgo?: string;
}

// 1. Persistent Device Identity
export function getPersistentDeviceId(): string {
  if (typeof window === 'undefined') return 'server_session';
  let devId = localStorage.getItem('uj_device_id');
  if (!devId) {
    devId = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
    localStorage.setItem('uj_device_id', devId);
  }
  return devId;
}

// 2. Client Device Properties Detector
export function detectDeviceDetails() {
  if (typeof window === 'undefined') {
    return {
      os: 'Windows 11 PC',
      browser: 'Google Chrome',
      deviceType: 'Desktop Workstation',
      screen: '1920 × 1080',
      deviceName: 'Showroom Workstation',
    };
  }

  const ua = navigator.userAgent;
  let os = 'Windows PC';
  if (ua.includes('Windows NT 10.0') || ua.includes('Windows NT 11.0')) os = 'Windows 11 / 10 PC';
  else if (ua.includes('Mac OS X')) os = 'macOS Apple Workstation';
  else if (ua.includes('Linux')) os = 'Linux Terminal';
  else if (ua.includes('Android')) os = 'Android Mobile';
  else if (ua.includes('iPhone')) os = 'Apple iPhone';
  else if (ua.includes('iPad')) os = 'Apple iPad';

  let browser = 'Google Chrome';
  if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Apple Safari';
  else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera';

  let deviceType = 'Desktop Workstation';
  if (/Mobi|Android|iPhone/i.test(ua)) deviceType = 'Mobile Device';
  else if (/Tablet|iPad/i.test(ua)) deviceType = 'Tablet / Scanner';

  const screen = `${window.screen?.width || 1920} × ${window.screen?.height || 1080}`;
  const savedName = localStorage.getItem('uj_device_custom_name');
  const deviceName = savedName || `${os.split(' ')[0]} ${deviceType.split(' ')[0]} (${browser})`;

  return { os, browser, deviceType, screen, deviceName };
}

// 3. Client IP detector
let cachedIp: string | null = null;
export async function getClientIp(): Promise<string> {
  if (cachedIp) return cachedIp;
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      cachedIp = data.ip;
      return data.ip;
    }
  } catch {
    // fallback if offline or blocked
  }
  return '192.168.1.105 (Local LAN)';
}

// 4. Time Ago Formatter: e.g. "30 Minutes ago"
export function formatTimeAgo(dateInput: string | Date | number): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 60) {
    return 'Just now';
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'Minute' : 'Minutes'} ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'Hour' : 'Hours'} ago`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? 'Day' : 'Days'} ago`;
  }
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} ${diffInMonths === 1 ? 'Month' : 'Months'} ago`;
}

// 5. Offline display string: e.g. "Today, 03:45 AM (30 Minutes ago)"
export function formatLastOnline(dateInput: string | Date | number): { fullString: string; timeAgo: string } {
  const date = new Date(dateInput);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  const isToday = new Date().toDateString() === date.toDateString();
  const isYesterday = new Date(Date.now() - 86400000).toDateString() === date.toDateString();

  let dayPrefix = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  if (isToday) dayPrefix = 'Today';
  else if (isYesterday) dayPrefix = 'Yesterday';

  const fullDateTime = `${dayPrefix}, ${timeStr}`;
  const timeAgo = formatTimeAgo(date);

  return {
    fullString: `${fullDateTime} (${timeAgo})`,
    timeAgo: `(${timeAgo})`
  };
}

// 6. Register / Send Heartbeat to Supabase
export async function recordDeviceHeartbeat(userEmail: string, tenantId: string = 'bashir'): Promise<void> {
  try {
    const deviceId = getPersistentDeviceId();
    const details = detectDeviceDetails();
    const ip = await getClientIp();

    const devicePayload: any = {
      deviceId,
      deviceName: details.deviceName,
      deviceType: details.deviceType,
      os: details.os,
      browser: details.browser,
      screen: details.screen,
      ip,
      location: 'Showroom Counter / Portal Active',
      status: 'online',
      lastActive: new Date().toISOString(),
      revoked: false
    };

    // First try user_devices table if present
    const { data: userDevCheck, error: userDevErr } = await supabase
      .from('user_devices')
      .select('id')
      .eq('device_id', deviceId)
      .maybeSingle();

    if (!userDevErr) {
      if (userDevCheck?.id) {
        await supabase
          .from('user_devices')
          .update({
            device_name: details.deviceName,
            last_active: new Date().toISOString(),
            is_active: true,
            ip_address: ip
          })
          .eq('id', userDevCheck.id);
      } else {
        await supabase
          .from('user_devices')
          .insert([{
            device_id: deviceId,
            user_email: userEmail || 'admin@ujc.com',
            tenant_id: tenantId || 'bashir',
            device_name: details.deviceName,
            device_type: details.deviceType,
            browser: details.browser,
            os: details.os,
            screen_resolution: details.screen,
            ip_address: ip,
            location_name: 'Showroom Counter',
            is_active: true,
            last_active: new Date().toISOString()
          }]);
      }
      return;
    }

    // Fallback to active audit_logs table
    const { data: existingLogs } = await supabase
      .from('audit_logs')
      .select('id, details')
      .eq('module', 'device_session');

    const matchedLog = existingLogs?.find(
      (l: any) => l.details && (l.details.deviceId === deviceId || l.details.device_id === deviceId)
    );

    if (matchedLog) {
      await supabase
        .from('audit_logs')
        .update({
          user_email: userEmail || 'admin@ujc.com',
          tenant_id: tenantId || 'bashir',
          action: 'DEVICE_HEARTBEAT',
          details: { ...matchedLog.details, ...devicePayload, lastActive: new Date().toISOString(), revoked: false }
        })
        .eq('id', matchedLog.id);
    } else {
      await supabase
        .from('audit_logs')
        .insert([{
          tenant_id: tenantId || 'bashir',
          user_email: userEmail || 'admin@ujc.com',
          action: 'DEVICE_REGISTER',
          module: 'device_session',
          details: devicePayload
        }]);
    }
  } catch (err) {
    console.warn('Device heartbeat notice:', err);
  }
}

// 7. Fetch all active and past devices
export async function fetchAllDevices(userEmail: string, tenantId: string = 'bashir'): Promise<UserDevice[]> {
  const currentDeviceId = getPersistentDeviceId();
  const currentDetails = detectDeviceDetails();
  const devicesMap = new Map<string, UserDevice>();

  try {
    // 1. Try fetching from user_devices table
    const { data: userDevData, error: userDevErr } = await supabase
      .from('user_devices')
      .select('*')
      .order('last_active', { ascending: false });

    if (!userDevErr && userDevData && userDevData.length > 0) {
      userDevData.forEach((row: any) => {
        const dId = row.device_id;
        const isCur = dId === currentDeviceId;
        const lastIso = row.last_active || row.created_at || new Date().toISOString();
        const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(lastIso).getTime()) / 1000));

        let status: 'online' | 'idle' | 'offline' = 'offline';
        if (isCur) {
          status = 'online';
        } else if (!row.is_active) {
          status = 'offline';
        } else if (diffSeconds < 120) {
          status = 'online';
        } else if (diffSeconds < 600) {
          status = 'idle';
        } else {
          status = 'offline';
        }

        const { fullString, timeAgo } = formatLastOnline(lastIso);

        devicesMap.set(dId, {
          id: row.id,
          deviceId: dId,
          deviceName: row.device_name || 'Workstation Terminal',
          deviceType: row.device_type || 'Desktop Workstation',
          os: row.os || 'Windows PC',
          browser: row.browser || 'Google Chrome',
          screen: row.screen_resolution || '1920 × 1080',
          ip: row.ip_address || '192.168.1.105',
          location: row.location_name || 'Showroom Floor',
          status,
          lastActive: lastIso,
          isCurrent: isCur,
          revoked: !row.is_active,
          formattedLastActive: fullString,
          timeAgo
        });
      });
    } else {
      // 2. Fallback to audit_logs
      const { data: auditData } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('module', 'device_session')
        .order('id', { ascending: false });

      if (auditData && auditData.length > 0) {
        auditData.forEach((row: any) => {
          const d = row.details;
          if (!d || (!d.deviceId && !d.device_id)) return;
          const dId = d.deviceId || d.device_id;
          if (devicesMap.has(dId)) return; // Keep latest row

          const isCur = dId === currentDeviceId;
          const lastIso = d.lastActive || row.created_at || new Date().toISOString();
          const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(lastIso).getTime()) / 1000));

          let status: 'online' | 'idle' | 'offline' = 'offline';
          if (isCur) {
            status = 'online';
          } else if (d.revoked) {
            status = 'offline';
          } else if (diffSeconds < 120) {
            status = 'online';
          } else if (diffSeconds < 600) {
            status = 'idle';
          } else {
            status = 'offline';
          }

          const { fullString, timeAgo } = formatLastOnline(lastIso);

          devicesMap.set(dId, {
            id: row.id,
            deviceId: dId,
            deviceName: d.deviceName || 'Workstation Terminal',
            deviceType: d.deviceType || 'Desktop Workstation',
            os: d.os || 'Windows PC',
            browser: d.browser || 'Google Chrome',
            screen: d.screen || '1920 × 1080',
            ip: d.ip || '192.168.1.105',
            location: d.location || 'Showroom Floor',
            status,
            lastActive: lastIso,
            isCurrent: isCur,
            revoked: !!d.revoked,
            formattedLastActive: fullString,
            timeAgo
          });
        });
      }
    }
  } catch (err) {
    console.warn('Error fetching devices:', err);
  }

  // Ensure current device is ALWAYS represented in the map
  if (!devicesMap.has(currentDeviceId)) {
    const nowIso = new Date().toISOString();
    const { fullString, timeAgo } = formatLastOnline(nowIso);
    devicesMap.set(currentDeviceId, {
      deviceId: currentDeviceId,
      deviceName: currentDetails.deviceName,
      deviceType: currentDetails.deviceType,
      os: currentDetails.os,
      browser: currentDetails.browser,
      screen: currentDetails.screen,
      ip: cachedIp || '192.168.1.105',
      location: 'Current Active Workstation',
      status: 'online',
      lastActive: nowIso,
      isCurrent: true,
      revoked: false,
      formattedLastActive: fullString,
      timeAgo
    });
  }

  return Array.from(devicesMap.values());
}

// 8. Revoke a single remote device
export async function revokeDevice(deviceId: string): Promise<void> {
  try {
    // Try user_devices
    const { error: devErr } = await supabase
      .from('user_devices')
      .update({ is_active: false })
      .eq('device_id', deviceId);

    // Try audit_logs
    const { data: auditData } = await supabase
      .from('audit_logs')
      .select('id, details')
      .eq('module', 'device_session');

    if (auditData) {
      for (const log of auditData) {
        if (log.details && (log.details.deviceId === deviceId || log.details.device_id === deviceId)) {
          await supabase
            .from('audit_logs')
            .update({
              details: { ...log.details, revoked: true, status: 'offline' }
            })
            .eq('id', log.id);
        }
      }
    }
  } catch (err) {
    console.error('Revoke device failed:', err);
  }
}

// 9. Revoke all remote devices (except current)
export async function revokeAllOtherDevices(): Promise<void> {
  const currentDeviceId = getPersistentDeviceId();
  try {
    // Try user_devices
    await supabase
      .from('user_devices')
      .update({ is_active: false })
      .neq('device_id', currentDeviceId);

    // Try audit_logs
    const { data: auditData } = await supabase
      .from('audit_logs')
      .select('id, details')
      .eq('module', 'device_session');

    if (auditData) {
      for (const log of auditData) {
        if (log.details && log.details.deviceId !== currentDeviceId && log.details.device_id !== currentDeviceId) {
          await supabase
            .from('audit_logs')
            .update({
              details: { ...log.details, revoked: true, status: 'offline' }
            })
            .eq('id', log.id);
        }
      }
    }
  } catch (err) {
    console.error('Revoke all other devices failed:', err);
  }
}

