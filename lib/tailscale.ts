export type TailscaleDeviceStatus = {
  id: string;
  name: string;
  os: string;
  online: boolean;
  lastSeen: string;
};

export type TailscaleStatusSummary = {
  configured: boolean;
  onlineCount: number;
  totalCount: number;
  devices: TailscaleDeviceStatus[];
  checkedAt: string;
};

type TailscaleDevice = {
  id?: string;
  nodeId?: string;
  name?: string;
  hostname?: string;
  os?: string;
  online?: boolean;
  connectedToControl?: boolean;
  lastSeen?: string;
  user?: string;
};

type TailscaleDevicesResponse = {
  devices?: TailscaleDevice[];
};

const fallbackOwnerLogin = "wuwuwu-lxb@github";
const fallbackOnlineWindowMs = 2 * 60 * 1000;

export async function getTailscaleStatus(): Promise<TailscaleStatusSummary> {
  const token = process.env.TAILSCALE_API_TOKEN?.trim();
  const tailnet = process.env.TAILSCALE_TAILNET?.trim();
  const ownerLogin = process.env.TAILSCALE_OWNER_LOGIN?.trim() || fallbackOwnerLogin;

  if (!token || !tailnet) {
    return {
      configured: false,
      onlineCount: 0,
      totalCount: 0,
      devices: [],
      checkedAt: new Date().toISOString(),
    };
  }

  try {
    const response = await fetch(`https://api.tailscale.com/api/v2/tailnet/${encodeURIComponent(tailnet)}/devices`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return emptyConfiguredSummary();
    }

    const payload = (await response.json()) as TailscaleDevicesResponse;
    const devices = (payload.devices ?? [])
      .filter((device) => shouldShowDevice(device, ownerLogin))
      .map(mapDevice)
      .sort((a, b) => Number(b.online) - Number(a.online) || b.lastSeen.localeCompare(a.lastSeen));

    return {
      configured: true,
      onlineCount: devices.filter((device) => device.online).length,
      totalCount: devices.length,
      devices: devices.slice(0, 8),
      checkedAt: new Date().toISOString(),
    };
  } catch {
    return emptyConfiguredSummary();
  }
}

function emptyConfiguredSummary(): TailscaleStatusSummary {
  return {
    configured: true,
    onlineCount: 0,
    totalCount: 0,
    devices: [],
    checkedAt: new Date().toISOString(),
  };
}

function shouldShowDevice(device: TailscaleDevice, ownerLogin: string) {
  return !device.user || device.user === ownerLogin;
}

function mapDevice(device: TailscaleDevice): TailscaleDeviceStatus {
  return {
    id: device.id || device.nodeId || device.name || crypto.randomUUID(),
    name: normalizeDeviceName(device.hostname || device.name || "未知设备"),
    os: device.os || "unknown",
    online: isDeviceOnline(device),
    lastSeen: device.lastSeen || "",
  };
}

function normalizeDeviceName(value: string) {
  return value.replace(/\.$/, "").split(".")[0] || value;
}

function isDeviceOnline(device: TailscaleDevice) {
  if (typeof device.connectedToControl === "boolean") {
    return device.connectedToControl;
  }

  if (typeof device.online === "boolean") {
    return device.online;
  }

  if (!device.lastSeen) {
    return false;
  }

  const onlineWindowMs = Number(process.env.TAILSCALE_ONLINE_WINDOW_SECONDS || 120) * 1000 || fallbackOnlineWindowMs;
  return Date.now() - new Date(device.lastSeen).getTime() <= onlineWindowMs;
}
