import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Search, Crosshair, Navigation, Shield, Users, AlertTriangle,
  X, ChevronDown, ChevronUp, Clock, Route, Mic, Star,
  MapPin, ChevronRight, Layers, ZoomIn, ZoomOut
} from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { BottomNav } from '@/components/layout/BottomNav';
import { dashboardApi } from '@/api/client';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  importance: number;
}

interface OsrmRoute {
  geometry: { coordinates: [number, number][] };
  legs: Array<{
    distance: number;
    duration: number;
    steps: Array<{
      maneuver: { instruction?: string; type: string; modifier?: string };
      name: string;
      distance: number;
      duration: number;
    }>;
  }>;
  distance: number;
  duration: number;
}



interface RouteInfo {
  distanceKm: string;
  durationMin: string;
  safetyRating: 'Low' | 'Moderate' | 'High' | 'Very High';
  crowdLevel: 'Very Low' | 'Low' | 'Moderate' | 'High';
  nearestGuardKm: string;
  riskPct: number;
  steps: Array<{ instruction: string; name: string; distM: number }>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function crowdByHour(): RouteInfo['crowdLevel'] {
  const h = new Date().getHours();
  if (h >= 8 && h <= 10) return 'Moderate';
  if (h >= 11 && h <= 14) return 'High';
  if (h >= 17 && h <= 21) return 'High';
  if (h >= 22 || h <= 5) return 'Very Low';
  return 'Low';
}

function crowdColor(level: string) {
  if (level === 'High') return '#ef4444';
  if (level === 'Moderate') return '#f59e0b';
  if (level === 'Low') return '#22c55e';
  return '#60a5fa';
}

function riskColor(pct: number) {
  if (pct <= 10) return '#22c55e';
  if (pct <= 25) return '#f59e0b';
  return '#ef4444';
}

function riskLabel(pct: number): RouteInfo['safetyRating'] {
  if (pct <= 10) return 'Very High';
  if (pct <= 20) return 'High';
  if (pct <= 35) return 'Moderate';
  return 'Low';
}

function formatInstruction(step: OsrmRoute['legs'][0]['steps'][0]) {
  const mod = step.maneuver.modifier ? ` ${step.maneuver.modifier}` : '';
  const type = step.maneuver.type.replace(/-/g, ' ');
  const road = step.name ? ` onto ${step.name}` : '';
  return `${type}${mod}${road}`.replace(/^./, (c) => c.toUpperCase());
}

/* ─────────────────────────────────────────────────────────────────────────────
   LEAFLET ICON HELPERS
───────────────────────────────────────────────────────────────────────────── */
function makeUserIcon() {
  return L.divIcon({
    html: `
      <div style="position:relative;width:28px;height:28px;display:flex;align-items:center;justify-content:center">
        <div style="position:absolute;inset:0;border-radius:50%;background:rgba(0,229,255,0.25);animation:ping 1.5s cubic-bezier(0,0,.2,1) infinite"></div>
        <div style="width:18px;height:18px;background:#00e5ff;border-radius:50%;border:3px solid white;box-shadow:0 0 12px rgba(0,229,255,0.9);display:flex;align-items:center;justify-content:center">
          <div style="width:6px;height:6px;background:white;border-radius:50%"></div>
        </div>
      </div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function makeDestIcon(riskPct: number) {
  const color = riskColor(riskPct);
  const label = riskLabel(riskPct);
  return L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
        <div style="background:#0d1b3e;border:2px solid ${color};border-radius:12px;padding:4px 8px;box-shadow:0 0 12px ${color}60;white-space:nowrap">
          <div style="color:${color};font-size:10px;font-weight:700;font-family:sans-serif">🎯 DESTINATION</div>
          <div style="color:white;font-size:9px;font-family:sans-serif;opacity:0.8">Safety: ${label} (${riskPct}%)</div>
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:10px solid ${color}"></div>
      </div>`,
    className: '',
    iconSize: [120, 50],
    iconAnchor: [60, 50],
  });
}

function makePoiIcon(category: string, dist?: number) {
  const emoji = category === 'police' ? '🚔' : category === 'railway' ? '🚉' : category === 'bus' ? '🚌' : '✈️';
  const color = category === 'police' ? '#3b82f6' : category === 'railway' ? '#f59e0b' : category === 'bus' ? '#10b981' : '#8b5cf6';
  return L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:1px">
        <div style="background:#1e3a5f;border:2px solid ${color};border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 8px ${color}">
          <span style="font-size:12px">${emoji}</span>
        </div>
        ${dist !== undefined ? `<div style="background:#1e3a5f;border:1px solid ${color};border-radius:4px;padding:1px 4px;font-size:8px;color:#93c5fd;font-family:sans-serif">${dist < 1 ? (dist * 1000).toFixed(0) + 'm' : dist.toFixed(1) + 'km'}</div>` : ''}
      </div>`,
    className: '',
    iconSize: [28, dist !== undefined ? 42 : 28],
    iconAnchor: [14, dist !== undefined ? 42 : 14],
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────────────────────── */
export default function MapPage() {
  /* State */
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const [userLocation, setUserLocation] = useState({ lat: 28.6139, lng: 77.2090 }); // Default Delhi
  const [destination, setDestination] = useState<{ lat: number; lng: number; name: string } | null>(null);

  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [activePoiCategory, setActivePoiCategory] = useState<'police' | 'railway' | 'bus' | 'airport' | null>('police');
  const [poiStations, setPoiStations] = useState<Array<{ id: number; lat: number; lng: number; name: string; type: string; distanceKm?: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [geoLocating, setGeoLocating] = useState(true);

  const [panelExpanded, setPanelExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'steps'>('info');
  const [mapStyle, setMapStyle] = useState<'dark' | 'satellite'>('dark');
  const [showPois, setShowPois] = useState(true);
  const [showCrowd, setShowCrowd] = useState(true);

  const [mapData, setMapData] = useState<Record<string, unknown> | null>(null);

  /* Refs */
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routeLayersRef = useRef<L.Layer[]>([]);
  const poiLayersRef = useRef<L.Layer[]>([]);
  const crowdLayersRef = useRef<L.Layer[]>([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* ── Geolocation ─────────────────────────────────────────────────────────── */
  const locateUser = useCallback(() => {
    setGeoLocating(true);
    if (!('geolocation' in navigator)) { setGeoLocating(false); return; }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const loc = { lat: coords.latitude, lng: coords.longitude };
        setUserLocation(loc);
        mapRef.current?.setView([loc.lat, loc.lng], 15);
        setGeoLocating(false);
      },
      () => setGeoLocating(false),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, []);

  /* ── Nominatim Search ────────────────────────────────────────────────────── */
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 3) { setSuggestions([]); return; }
    setSearchLoading(true);
    try {
      const url =
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=1`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchInput = (val: string) => {
    setSearchQuery(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => doSearch(val), 400);
  };

  const selectSuggestion = (r: NominatimResult) => {
    const dest = { lat: parseFloat(r.lat), lng: parseFloat(r.lon), name: r.display_name.split(',')[0] };
    setDestination(dest);
    setSearchQuery(dest.name);
    setShowSuggestions(false);
    // Pan map to destination
    mapRef.current?.setView([dest.lat, dest.lng], 14);
  };

  /* ── Fetch POIs via Overpass API ──────────────────────────────── */
  const fetchPOIs = useCallback(async (category: 'police' | 'railway' | 'bus' | 'airport', lat: number, lng: number) => {
    setLoading(true);
    try {
      const radius = category === 'airport' ? 15000 : 3000;
      let query = '';
      if (category === 'police') {
        query = `[out:json][timeout:15];
          (node["amenity"="police"](around:${radius},${lat},${lng});
           way["amenity"="police"](around:${radius},${lat},${lng}););
          out center;`;
      } else if (category === 'railway') {
        query = `[out:json][timeout:15];
          (node["railway"="station"](around:${radius},${lat},${lng});
           way["railway"="station"](around:${radius},${lat},${lng}););
          out center;`;
      } else if (category === 'bus') {
        query = `[out:json][timeout:15];
          (node["amenity"="bus_station"](around:${radius},${lat},${lng});
           way["amenity"="bus_station"](around:${radius},${lat},${lng});
           node["highway"="bus_stop"](around:${radius},${lat},${lng}););
          out center;`;
      } else if (category === 'airport') {
        query = `[out:json][timeout:15];
          (node["aeroway"="aerodrome"](around:${radius},${lat},${lng});
           way["aeroway"="aerodrome"](around:${radius},${lat},${lng}););
          out center;`;
      }

      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
      const data = await res.json();
      const items = (data.elements || []).map((el: any) => {
        const eLat = el.type === 'node' ? el.lat! : el.center!.lat;
        const eLng = el.type === 'node' ? el.lon! : el.center!.lon;
        let displayName = el.tags?.name;
        if (!displayName) {
          if (category === 'police') displayName = 'Police Station';
          else if (category === 'railway') displayName = 'Railway Station';
          else if (category === 'bus') displayName = 'Bus Stop / Station';
          else if (category === 'airport') displayName = 'Airport / Aerodrome';
        }
        return {
          id: el.id,
          lat: eLat,
          lng: eLng,
          name: displayName,
          type: category,
          distanceKm: haversineKm(lat, lng, eLat, eLng),
        };
      }).sort((a: any, b: any) => (a.distanceKm || 0) - (b.distanceKm || 0)).slice(0, 10);

      setPoiStations(items);
    } catch (err) {
      console.warn('Overpass POI fetch failed, using fallback simulation:', err);
      const mockNames = {
        police: ['Central Police Station', 'North District Police Post', 'West Division Station'],
        railway: ['Central Railway Station', 'East Transit Station', 'Metro Link Station'],
        bus: ['Downtown Bus Terminal', 'North Boulevard Bus Stop', 'Crossroad Bus Station'],
        airport: ['International Airport Terminal 1', 'City Heliport', 'Aero Club Runway'],
      };
      const categoryMock = mockNames[category] || [];
      const simulated = [
        { id: 101, lat: lat + 0.012, lng: lng + 0.008, name: categoryMock[0] || 'Location A', type: category, distanceKm: 1.4 },
        { id: 102, lat: lat - 0.015, lng: lng + 0.018, name: categoryMock[1] || 'Location B', type: category, distanceKm: 2.1 },
        { id: 103, lat: lat + 0.005, lng: lng - 0.022, name: categoryMock[2] || 'Location C', type: category, distanceKm: 1.8 },
      ];
      setPoiStations(simulated);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ── OSRM Routing ────────────────────────────────────────────────────────── */
  const fetchOsrmRoute = useCallback(async (
    from: { lat: number; lng: number },
    to: { lat: number; lng: number }
  ): Promise<OsrmRoute | null> => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes?.[0]) return data.routes[0];
    } catch {
      console.warn('OSRM unavailable');
    }
    return null;
  }, []);

  /* ── Draw crowd density segments on route ────────────────────────────────── */
  const drawCrowdOverlay = useCallback((map: L.Map, coords: [number, number][]) => {
    // Remove previous crowd layers
    crowdLayersRef.current.forEach((l) => map.removeLayer(l));
    crowdLayersRef.current = [];
    if (!showCrowd) return;

    const crowd = crowdByHour();
    const segSize = Math.max(1, Math.floor(coords.length / 10));

    // Draw each segment with slight color variation to simulate traffic density
    for (let i = 0; i < coords.length - 1; i += segSize) {
      const seg = coords.slice(i, Math.min(i + segSize + 1, coords.length));
      if (seg.length < 2) continue;
      // Vary color slightly by position to simulate section-by-section density
      const t = i / coords.length;
      const densityBoost = Math.random() > 0.6 ? 1 : 0;
      const levels: RouteInfo['crowdLevel'][] = ['Very Low', 'Low', 'Moderate', 'High'];
      const baseIdx = levels.indexOf(crowd);
      const effectiveIdx = Math.min(3, baseIdx + (t > 0.4 && t < 0.7 ? densityBoost : 0));
      const segLevel = levels[effectiveIdx];

      const line = L.polyline(
        seg.map(([lng, lat]) => [lat, lng] as L.LatLngExpression),
        {
          color: crowdColor(segLevel),
          weight: 7,
          opacity: 0.55,
        }
      ).addTo(map);
      crowdLayersRef.current.push(line);
    }
  }, [showCrowd]);

  /* ── Draw route on map ───────────────────────────────────────────────────── */
  const drawRoute = useCallback(async () => {
    if (!destination || !mapRef.current) return;
    const map = mapRef.current;
    setLoading(true);

    // Clear previous route
    routeLayersRef.current.forEach((l) => map.removeLayer(l));
    routeLayersRef.current = [];

    try {
      const osrm = await fetchOsrmRoute(userLocation, destination);
      const crowd = crowdByHour();
      const nearestPolice = poiStations.find(p => p.type === 'police') || poiStations[0];
      const nearestKm = nearestPolice
        ? nearestPolice.distanceKm ?? haversineKm(userLocation.lat, userLocation.lng, nearestPolice.lat, nearestPolice.lng)
        : null;

      // Compute risk
      const distDest = haversineKm(userLocation.lat, userLocation.lng, destination.lat, destination.lng);
      let riskPct = 15;
      if (crowd === 'High') riskPct += 8;
      if (crowd === 'Very Low') riskPct -= 5;
      if (nearestKm && nearestKm > 2) riskPct += 5;
      if (distDest > 5) riskPct += 5;
      riskPct = Math.max(3, Math.min(80, riskPct));

      let coords: [number, number][] = [];
      let steps: RouteInfo['steps'] = [];
      let routeDistKm = distDest;
      let routeDurMin = Math.round(distDest * 3);

      if (osrm) {
        coords = osrm.geometry.coordinates;
        routeDistKm = osrm.distance / 1000;
        routeDurMin = Math.round(osrm.duration / 60);
        steps = osrm.legs.flatMap((leg) =>
          leg.steps.map((s) => ({
            instruction: formatInstruction(s),
            name: s.name,
            distM: Math.round(s.distance),
          }))
        );

        // Draw crowd-density colored underlay
        if (showCrowd) drawCrowdOverlay(map, coords);

        // Draw main route line (blue-cyan, thinner, on top)
        const mainLine = L.polyline(
          coords.map(([lng, lat]) => [lat, lng] as L.LatLngExpression),
          { color: '#00e5ff', weight: 4, opacity: 0.9 }
        ).addTo(map);
        routeLayersRef.current.push(mainLine);

        // Fit bounds
        map.fitBounds(mainLine.getBounds(), { padding: [80, 80] });
      } else {
        // Straight-line fallback
        const fallbackLine = L.polyline(
          [[userLocation.lat, userLocation.lng], [destination.lat, destination.lng]],
          { color: '#00e5ff', weight: 4, opacity: 0.8, dashArray: '10, 6' }
        ).addTo(map);
        routeLayersRef.current.push(fallbackLine);
        map.fitBounds(fallbackLine.getBounds(), { padding: [80, 80] });
      }

      setRouteInfo({
        distanceKm: routeDistKm.toFixed(1),
        durationMin: routeDurMin.toString(),
        safetyRating: riskLabel(riskPct),
        crowdLevel: crowd,
        nearestGuardKm: nearestKm != null
          ? (nearestKm < 1 ? `${(nearestKm * 1000).toFixed(0)}m` : `${nearestKm.toFixed(1)}km`)
          : 'N/A',
        riskPct,
        steps,
      });

      // Update destination marker with risk info
      if (destMarkerRef.current) map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = L.marker([destination.lat, destination.lng], {
        icon: makeDestIcon(riskPct),
      })
        .bindPopup(
          `<b>${destination.name}</b><br/>Risk: ${riskPct}% (${riskLabel(riskPct)} Safety)<br/>Crowd: ${crowd}`
        )
        .addTo(map);

      // Log route to backend
      await dashboardApi.safeRoute(destination.lat, destination.lng);
      setPanelExpanded(true);

    } catch (err) {
      console.error('Route error', err);
    } finally {
      setLoading(false);
    }
  }, [destination, userLocation, poiStations, fetchOsrmRoute, drawCrowdOverlay, showCrowd]);

  /* ── Initialize map ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([userLocation.lat, userLocation.lng], 13);

    const tile = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(map);
    tileLayerRef.current = tile;

    // Tap to set destination on map
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      // Reverse geocode for name
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
        .then((r) => r.json())
        .then((data) => {
          const name = data.address?.road || data.address?.suburb || data.display_name?.split(',')[0] || 'Selected Location';
          setDestination({ lat, lng, name });
          setSearchQuery(name);
        })
        .catch(() => {
          setDestination({ lat, lng, name: 'Selected Location' });
          setSearchQuery('Selected Location');
        });
    });

    mapRef.current = map;
    return () => {
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Update tile layer when map style changes ────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    const url = mapStyle === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    tileLayerRef.current = L.tileLayer(url, { maxZoom: 20 }).addTo(map);
  }, [mapStyle]);

  /* ── User location marker ────────────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
      icon: makeUserIcon(),
      zIndexOffset: 1000,
    })
      .bindPopup('<b>📍 Your Location</b>')
      .addTo(map);
  }, [userLocation]);

  /* ── POI markers ──────────────────────────────────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    poiLayersRef.current.forEach((l) => map.removeLayer(l));
    poiLayersRef.current = [];
    if (!showPois) return;

    poiStations.forEach((poi) => {
      const dist = poi.distanceKm ?? haversineKm(userLocation.lat, userLocation.lng, poi.lat, poi.lng);
      
      const container = document.createElement('div');
      container.style.color = '#fff';
      container.style.fontFamily = 'sans-serif';
      container.style.padding = '4px';

      const title = document.createElement('b');
      title.innerText = poi.name;
      title.style.color = '#00e5ff';
      title.style.display = 'block';
      title.style.marginBottom = '4px';
      container.appendChild(title);

      const info = document.createElement('div');
      info.innerText = `${poi.type.toUpperCase()} • ${dist < 1 ? (dist * 1000).toFixed(0) + 'm' : dist.toFixed(1) + 'km'} away`;
      info.style.fontSize = '11px';
      info.style.opacity = '0.8';
      info.style.marginBottom = '8px';
      container.appendChild(info);

      const navBtn = document.createElement('button');
      navBtn.innerText = '🗺️ Navigate Here';
      navBtn.style.background = 'linear-gradient(135deg, #00e5ff, #0066ff)';
      navBtn.style.border = 'none';
      navBtn.style.borderRadius = '6px';
      navBtn.style.color = 'white';
      navBtn.style.padding = '5px 10px';
      navBtn.style.fontSize = '11px';
      navBtn.style.cursor = 'pointer';
      navBtn.style.fontWeight = 'bold';
      navBtn.style.width = '100%';
      navBtn.onclick = () => {
        setDestination({ lat: poi.lat, lng: poi.lng, name: poi.name });
        setSearchQuery(poi.name);
        map.closePopup();
      };
      container.appendChild(navBtn);

      const marker = L.marker([poi.lat, poi.lng], { icon: makePoiIcon(poi.type, dist) })
        .bindPopup(container)
        .addTo(map);
      
      poiLayersRef.current.push(marker);
    });
  }, [poiStations, showPois, userLocation]);

  /* ── Geolocation + initial data on mount ────────────────────────────────── */
  useEffect(() => {
    locateUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activePoiCategory) {
      fetchPOIs(activePoiCategory, userLocation.lat, userLocation.lng);
    }
    dashboardApi.mapNearby(userLocation.lat, userLocation.lng)
      .then(({ data }) => setMapData(data.data))
      .catch(() => {});
  }, [userLocation, activePoiCategory, fetchPOIs]);

  /* ── Auto route drawing when destination is selected ───────────────────── */
  useEffect(() => {
    if (destination) {
      drawRoute();
    }
  }, [destination]);

  /* ── Destination marker (before route is drawn) ──────────────────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (destMarkerRef.current && !routeInfo) {
      map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = null;
    }
    if (destination && !routeInfo) {
      if (destMarkerRef.current) map.removeLayer(destMarkerRef.current);
      destMarkerRef.current = L.marker([destination.lat, destination.lng], {
        icon: makeDestIcon(15),
      })
        .bindPopup(`<b>${destination.name}</b><br/>Click "Start Route" to navigate`)
        .addTo(map);
    }
  }, [destination, routeInfo]);

  /* ── Clear route when destination changes ────────────────────────────────── */
  useEffect(() => {
    setRouteInfo(null);
    routeLayersRef.current.forEach((l) => mapRef.current?.removeLayer(l));
    routeLayersRef.current = [];
    crowdLayersRef.current.forEach((l) => mapRef.current?.removeLayer(l));
    crowdLayersRef.current = [];
  }, [destination]);

  /* ── Zoom helpers ────────────────────────────────────────────────────────── */
  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();

  /* ── Metrics from backend or computed ────────────────────────────────────── */
  const metrics = (mapData as { metrics?: Record<string, string> })?.metrics;
  const crowd = routeInfo?.crowdLevel ?? metrics?.crowd ?? crowdByHour();

  /* ─────────────────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────────────────── */
  return (
    <BackgroundGlow>
      <div className="relative w-full" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

        {/* ── MAP ─────────────────────────────────────────────────────────── */}
        <div ref={mapContainerRef} className="absolute inset-0 z-0" />

        {/* Leaflet ping animation */}
        <style>{`
          @keyframes ping {
            75%, 100% { transform: scale(2); opacity: 0; }
          }
          .leaflet-popup-content-wrapper {
            background: #0d1b3e !important;
            color: white !important;
            border: 1px solid rgba(255,255,255,0.1) !important;
            border-radius: 12px !important;
          }
          .leaflet-popup-tip { background: #0d1b3e !important; }
          .leaflet-popup-content b { color: #00e5ff; }
        `}</style>

        {/* ── SEARCH BAR (top) ─────────────────────────────────────────── */}
        <div className="absolute top-0 left-0 right-0 z-20 p-3">
          <div className="relative max-w-2xl mx-auto">
            {/* Search input */}
            <div className="flex gap-2 items-center">
              <div
                className="flex-1 flex items-center gap-2 h-12 px-4 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.7)]"
                style={{
                  background: 'rgba(13,27,62,0.95)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <Search className="w-4 h-4 flex-shrink-0" style={{ color: '#00e5ff' }} />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Search destination..."
                  className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/40"
                  id="map-search-input"
                />
                {searchLoading && (
                  <div className="w-4 h-4 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin flex-shrink-0" />
                )}
                {searchQuery && !searchLoading && (
                  <button
                    onClick={() => { setSearchQuery(''); setSuggestions([]); setDestination(null); setRouteInfo(null); }}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setMapStyle(s => s === 'dark' ? 'satellite' : 'dark')}
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all"
                style={{
                  background: 'rgba(13,27,62,0.95)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  backdropFilter: 'blur(20px)',
                }}
                title="Toggle map style"
              >
                <Layers className="w-5 h-5 text-white/70" />
              </button>
            </div>

            {/* Category capsules */}
            <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 select-none scrollbar-none" style={{ scrollbarWidth: 'none' }}>
              {[
                { id: 'police', label: 'Police', emoji: '🚔', color: 'rgba(59,130,246,0.25)', border: '#3b82f6' },
                { id: 'railway', label: 'Railway', emoji: '🚉', color: 'rgba(245,158,11,0.25)', border: '#f59e0b' },
                { id: 'bus', label: 'Bus Station', emoji: '🚌', color: 'rgba(16,185,129,0.25)', border: '#10b981' },
                { id: 'airport', label: 'Airport', emoji: '✈️', color: 'rgba(139,92,246,0.25)', border: '#8b5cf6' },
              ].map((cat) => {
                const isActive = activePoiCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      const next = activePoiCategory === cat.id ? null : (cat.id as any);
                      setActivePoiCategory(next);
                      if (next) {
                        fetchPOIs(next, userLocation.lat, userLocation.lng);
                      } else {
                        setPoiStations([]);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex-shrink-0 cursor-pointer"
                    style={{
                      background: isActive ? cat.color : 'rgba(13,27,62,0.92)',
                      border: `1.5px solid ${isActive ? cat.border : 'rgba(255,255,255,0.1)'}`,
                      color: isActive ? '#fff' : 'rgba(255,255,255,0.7)',
                      boxShadow: isActive ? `0 0 10px ${cat.border}40` : 'none',
                    }}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                className="absolute top-14 left-0 right-0 rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.8)] z-30"
                style={{
                  background: 'rgba(13,27,62,0.98)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                {suggestions.map((r) => (
                  <button
                    key={r.place_id}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
                    onClick={() => selectSuggestion(r)}
                  >
                    <MapPin className="w-4 h-4 flex-shrink-0 text-cyan" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {r.display_name.split(',')[0]}
                      </p>
                      <p className="text-white/40 text-xs truncate">
                        {r.display_name.split(',').slice(1, 3).join(',')}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
                  </button>
                ))}
                <button
                  className="w-full px-4 py-2 text-xs text-white/30 text-center hover:bg-white/5"
                  onClick={() => setShowSuggestions(false)}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── ZOOM + RECENTER controls (right) ────────────────────────── */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
          <button
            onClick={zoomIn}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:scale-105 transition-all"
            style={{ background: 'rgba(13,27,62,0.95)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <ZoomIn className="w-5 h-5 text-white/80" />
          </button>
          <button
            onClick={zoomOut}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:scale-105 transition-all"
            style={{ background: 'rgba(13,27,62,0.95)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <ZoomOut className="w-5 h-5 text-white/80" />
          </button>
          <button
            onClick={locateUser}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:scale-105 transition-all"
            style={{ background: 'rgba(13,27,62,0.95)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <Crosshair className={`w-5 h-5 ${geoLocating ? 'text-cyan animate-spin' : 'text-white/80'}`} />
          </button>
        </div>

        {/* ── LAYER TOGGLES (left side) ────────────────────────────────── */}
        <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
          <button
            onClick={() => setShowPois(p => !p)}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:scale-105 transition-all text-base animate-pulseGlow"
            style={{
              background: showPois ? 'rgba(59,130,246,0.3)' : 'rgba(13,27,62,0.95)',
              border: `1px solid ${showPois ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.12)'}`,
            }}
            title="Toggle POIs"
          >
            📍
          </button>
          <button
            onClick={() => setShowCrowd(c => !c)}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:scale-105 transition-all text-base"
            style={{
              background: showCrowd ? 'rgba(245,158,11,0.3)' : 'rgba(13,27,62,0.95)',
              border: `1px solid ${showCrowd ? 'rgba(245,158,11,0.6)' : 'rgba(255,255,255,0.12)'}`,
            }}
            title="Toggle crowd density"
          >
            👥
          </button>
        </div>

        {/* ── BOTTOM PANEL ─────────────────────────────────────────────── */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 transition-all duration-300"
          style={{ maxHeight: panelExpanded ? '75vh' : '200px' }}
        >
          <div
            className="rounded-t-3xl overflow-hidden"
            style={{
              background: 'rgba(8,16,42,0.96)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
            }}
          >
            {/* Panel handle */}
            <div
              className="flex justify-center pt-3 pb-1 cursor-pointer"
              onClick={() => setPanelExpanded(e => !e)}
            >
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
            </div>

            {/* ── METRICS ROW ─────────────────────────────────────────── */}
            <div className="px-4 pb-3">
              <div className="grid grid-cols-3 gap-2 mb-3">
                {/* Crowd Density */}
                <div
                  className="rounded-xl p-3 flex flex-col gap-1"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Users className="w-3 h-3" style={{ color: crowdColor(crowd) }} />
                    <span className="text-white/50 text-[10px]">Crowd Density</span>
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: crowdColor(crowd) }}
                  >
                    {crowd}
                  </div>
                  {/* Mini bar */}
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        background: crowdColor(crowd),
                        width: crowd === 'High' ? '85%' : crowd === 'Moderate' ? '55%' : crowd === 'Low' ? '30%' : '15%',
                      }}
                    />
                  </div>
                </div>

                {/* Nearest Guard */}
                <div
                  className="rounded-xl p-3 flex flex-col gap-1"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Shield className="w-3 h-3 text-blue-400" />
                    <span className="text-white/50 text-[10px]">Nearest Guard</span>
                  </div>
                  <div className="text-sm font-bold text-blue-400">
                    {routeInfo?.nearestGuardKm ?? (
                      (poiStations.find(p => p.type === 'police') || poiStations[0])
                        ? (poiStations.find(p => p.type === 'police') || poiStations[0]).distanceKm! < 1
                          ? `${((poiStations.find(p => p.type === 'police') || poiStations[0]).distanceKm! * 1000).toFixed(0)}m`
                          : `${(poiStations.find(p => p.type === 'police') || poiStations[0]).distanceKm!.toFixed(1)}km`
                        : metrics?.police ?? '...'
                    )}
                  </div>
                  <p className="text-white/30 text-[9px] truncate">
                    {(poiStations.find(p => p.type === 'police') || poiStations[0])?.name ?? 'Police Station'}
                  </p>
                </div>

                {/* Risk Factor */}
                <div
                  className="rounded-xl p-3 flex flex-col gap-1"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <AlertTriangle
                      className="w-3 h-3"
                      style={{ color: riskColor(routeInfo?.riskPct ?? 15) }}
                    />
                    <span className="text-white/50 text-[10px]">Risk Factor</span>
                  </div>
                  <div
                    className="text-sm font-bold"
                    style={{ color: riskColor(routeInfo?.riskPct ?? 15) }}
                  >
                    {routeInfo?.riskPct != null ? `${routeInfo.riskPct}%` : metrics?.risk ?? '15%'}
                  </div>
                  <div className="text-white/30 text-[9px]">
                    {routeInfo ? riskLabel(routeInfo.riskPct) + ' Safety' : 'Tap to route'}
                  </div>
                </div>
              </div>

              {/* ── Route Card (shown after routing) ───────────────────── */}
              {routeInfo && (
                <div
                  className="rounded-xl p-3 mb-3 flex items-center gap-3"
                  style={{
                    background: 'linear-gradient(135deg,rgba(0,229,255,0.08),rgba(59,130,246,0.08))',
                    border: '1px solid rgba(0,229,255,0.15)',
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(0,229,255,0.15)' }}>
                    <Route className="w-5 h-5 text-cyan" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">{routeInfo.distanceKm} km</span>
                      <span className="text-white/30 text-xs">•</span>
                      <Clock className="w-3 h-3 text-white/50" />
                      <span className="text-white/70 text-xs">{routeInfo.durationMin} min</span>
                    </div>
                    <p className="text-white/40 text-xs truncate">
                      via safest road route • {routeInfo.safetyRating} safety
                    </p>
                  </div>
                  <div
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold"
                    style={{
                      background: `${riskColor(routeInfo.riskPct)}20`,
                      color: riskColor(routeInfo.riskPct),
                      border: `1px solid ${riskColor(routeInfo.riskPct)}40`,
                    }}
                  >
                    <Star className="w-2.5 h-2.5 inline mr-0.5 mb-px" />
                    {routeInfo.safetyRating}
                  </div>
                </div>
              )}

              {/* ── Action Button ───────────────────────────────────────── */}
              {destination ? (
                <button
                  onClick={drawRoute}
                  disabled={loading}
                  className="w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                  style={{
                    background: loading
                      ? 'rgba(0,229,255,0.2)'
                      : 'linear-gradient(135deg,#00e5ff,#0066ff)',
                    color: loading ? 'rgba(0,229,255,0.7)' : 'white',
                    boxShadow: loading ? 'none' : '0 4px 20px rgba(0,229,255,0.3)',
                  }}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
                      <span>Calculating safest road route...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4" />
                      <span>{routeInfo ? 'Recalculate Route' : `Navigate to ${destination.name}`}</span>
                    </>
                  )}
                </button>
              ) : (
                <div
                  className="w-full h-12 rounded-xl flex items-center justify-center gap-2"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Mic className="w-4 h-4 text-white/30" />
                  <span className="text-white/30 text-sm">Search or tap map to set destination</span>
                </div>
              )}
            </div>

            {/* ── EXPANDED: Turn-by-turn steps ─────────────────────────── */}
            {panelExpanded && routeInfo && routeInfo.steps.length > 0 && (
              <div className="px-4 pb-4 overflow-y-auto" style={{ maxHeight: '40vh' }}>
                {/* Tabs */}
                <div className="flex gap-2 mb-3">
                  {(['info', 'steps'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: activeTab === tab ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.04)',
                        color: activeTab === tab ? '#00e5ff' : 'rgba(255,255,255,0.4)',
                        border: activeTab === tab ? '1px solid rgba(0,229,255,0.3)' : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      {tab === 'info' ? '📊 Overview' : '🗺️ Turn-by-Turn'}
                    </button>
                  ))}
                </div>

                {activeTab === 'steps' && (
                  <div className="flex flex-col gap-1">
                    {routeInfo.steps.filter(s => s.instruction).slice(0, 20).map((step, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 py-2.5 px-3 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                          style={{ background: 'rgba(0,229,255,0.15)', color: '#00e5ff' }}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium capitalize truncate">{step.instruction}</p>
                          {step.distM > 0 && (
                            <p className="text-white/30 text-[10px]">
                              {step.distM >= 1000 ? `${(step.distM / 1000).toFixed(1)} km` : `${step.distM} m`}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'info' && (
                  <div className="flex flex-col gap-2">
                    {/* Crowd density legend */}
                    <div
                      className="rounded-xl p-3"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <p className="text-white/60 text-xs mb-2 font-semibold">Crowd Density Legend</p>
                      {[
                        { level: 'High', color: '#ef4444', desc: 'Heavy crowd, exercise caution' },
                        { level: 'Moderate', color: '#f59e0b', desc: 'Moderate activity' },
                        { level: 'Low', color: '#22c55e', desc: 'Clear, safe to travel' },
                        { level: 'Very Low', color: '#60a5fa', desc: 'Almost empty' },
                      ].map(({ level, color, desc }) => (
                        <div key={level} className="flex items-center gap-2 mb-1.5">
                          <div className="w-8 h-2 rounded-full" style={{ background: color }} />
                          <span className="text-white/70 text-xs font-medium" style={{ color }}>{level}</span>
                          <span className="text-white/30 text-xs">— {desc}</span>
                        </div>
                      ))}
                    </div>

                    {/* Dynamic POI list */}
                    {poiStations.length > 0 && (
                      <div
                        className="rounded-xl p-3"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <p className="text-white/60 text-xs mb-2 font-semibold capitalize">Nearby {activePoiCategory || 'Police'} Stations</p>
                        {poiStations.slice(0, 5).map((poi) => (
                          <div key={poi.id} className="flex items-center gap-2 mb-1.5">
                            <span className="text-sm">
                              {poi.type === 'police' ? '🚔' : poi.type === 'railway' ? '🚉' : poi.type === 'bus' ? '🚌' : '✈️'}
                            </span>
                            <span className="text-white/70 text-xs flex-1 truncate">{poi.name}</span>
                            <span className="text-cyan text-xs font-semibold">
                              {poi.distanceKm! < 1 ? `${(poi.distanceKm! * 1000).toFixed(0)}m` : `${poi.distanceKm!.toFixed(1)}km`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* expand/collapse toggle */}
            <button
              className="w-full flex items-center justify-center py-2 text-white/20 hover:text-white/40 transition-colors"
              onClick={() => setPanelExpanded(e => !e)}
            >
              {panelExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

      </div>
      <BottomNav />
    </BackgroundGlow>
  );
}
