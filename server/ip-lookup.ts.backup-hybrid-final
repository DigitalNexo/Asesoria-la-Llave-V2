const CACHE: Map<string, any> = new Map();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24h

export default async function ipLookup(ip: string) {
  if (!ip) return null;
  const cached = CACHE.get(ip);
  if (cached && Date.now() - cached._ts < CACHE_TTL) return cached.value;

  try {
    const token = process.env.IPINFO_TOKEN;
    if (!token) {
      // fallback: minimal info
      const minimal = { ip, country: null, city: null, isp: null, asn: null, latitude: null, longitude: null, isVpn: false, vpnScore: 0 };
      CACHE.set(ip, { _ts: Date.now(), value: minimal });
      return minimal;
    }
    const res = await fetch(`https://ipinfo.io/${ip}?token=${token}`);
    if (!res.ok) throw new Error(`ipinfo returned ${res.status}`);
    const data = await res.json();
    const [lat, lon] = (data.loc || ',').split(',');
    const out = {
      ip,
      isp: data.org || null,
      asn: data?.asn?.asn || (data.org || null),
      country: data.country || null,
      city: data.city || null,
      latitude: lat ? parseFloat(lat) : null,
      longitude: lon ? parseFloat(lon) : null,
      isVpn: data?.privacy?.vpn || false,
      vpnScore: data?.privacy?.score ?? 0,
    };
    CACHE.set(ip, { _ts: Date.now(), value: out });
    return out;
  } catch (err) {
    console.warn('ipLookup error', err?.message || err);
    const minimal = { ip, country: null, city: null, isp: null, asn: null, latitude: null, longitude: null, isVpn: false, vpnScore: 0 };
    CACHE.set(ip, { _ts: Date.now(), value: minimal });
    return minimal;
  }
}
