export function normalizeIp(raw?: string | null): string | null {
  if (!raw) return null;
  const first = String(raw).split(',')[0].trim();
  // remove port if present
  const noPort = first.split(':').length > 4 && first.includes(']:') ? first.split(']:')[0].replace('[', '') : first.split(':')[0];
  // handle IPv4-mapped IPv6 like ::ffff:127.0.0.1
  if (first.includes('::ffff:')) {
    return first.split('::ffff:').pop() || null;
  }
  // if noPort is an IPv4-looking string, return it; otherwise return first
  if (/^\d+\.\d+\.\d+\.\d+$/.test(noPort)) return noPort;
  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(first)) return first.split(':')[0];
  return first;
}

function ipToLong(ip: string): number {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    throw new Error('Not IPv4');
  }
  return (
    ((parts[0] << 24) >>> 0) +
    ((parts[1] << 16) >>> 0) +
    ((parts[2] << 8) >>> 0) +
    (parts[3] >>> 0)
  ) >>> 0;
}

export function isIpInCidr(ipRaw: string | null, cidrRaw: string): boolean {
  if (!ipRaw) return false;
  const ip = normalizeIp(ipRaw);
  if (!ip) return false;

  const cidr = String(cidrRaw).trim();
  let base = cidr;
  let prefix = 32;
  if (cidr.includes('/')) {
    const parts = cidr.split('/');
    base = parts[0];
    prefix = Number(parts[1]);
  }

  try {
    const ipLong = ipToLong(ip);
    const baseLong = ipToLong(normalizeIp(base) || '0.0.0.0');
    if (prefix === 32) {
      return ipLong === baseLong;
    }
    const mask = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
    return (ipLong & mask) === (baseLong & mask);
  } catch (e) {
    return false;
  }
}

export function isIpInAnyCidr(ipRaw: string | null, cidrs: string[] | null | undefined): boolean {
  if (!cidrs || cidrs.length === 0) return true; // no restrictions
  for (const c of cidrs) {
    if (isIpInCidr(ipRaw, c)) return true;
  }
  return false;
}

export function isValidIpOrCidr(value: string): boolean {
  const raw = String(value || '').trim();
  if (!raw) return false;
  const [base, prefixRaw] = raw.split('/');
  const normalizedBase = normalizeIp(base);
  if (!normalizedBase || !/^\d+\.\d+\.\d+\.\d+$/.test(normalizedBase)) return false;

  const parts = normalizedBase.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return false;

  if (typeof prefixRaw === 'undefined') return true;
  if (!/^\d+$/.test(prefixRaw)) return false;
  const prefix = Number(prefixRaw);
  return prefix >= 0 && prefix <= 32;
}
