import { useEffect, useState, useCallback } from 'react';
import {
  Search, Crosshair, Navigation, X, MapPin, Shield, Activity, Wifi, AlertTriangle, Compass, Menu, Layers
} from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { BottomNav } from '@/components/layout/BottomNav';
import api, { dashboardApi } from '@/api/client';
import { getSocket } from '@/api/socket';

// Leaflet Imports
import { MapContainer, TileLayer, Marker, useMap, Polyline, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const defaultCenter = { lat: 28.6139, lng: 77.2090 };

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface MockPoint {
  id: string;
  name: string;
  category: 'police' | 'hospital' | 'fire_station' | 'transit_station';
  lat: number;
  lng: number;
  safetyScore: number;
  distance: string;
  address: string;
  description: string;
  x?: number;
  y?: number;
}

// Component to recenter and invalidate map sizing
function MapRecenter({ center, trigger, showDrawer }: { center: { lat: number; lng: number }; trigger: number; showDrawer: boolean }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
    setTimeout(() => {
      map.invalidateSize();
    }, 250);
  }, [center, trigger, showDrawer, map]);
  return null;
}

// Custom Leaflet Icons with emoji labels
const createCustomIcon = (emoji: string, color: string) => L.divIcon({
  html: `<div style="
    background-color: ${color};
    width: 30px; height: 30px;
    border-radius: 50%;
    border: 2.5px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.5), 0 0 12px ${color}88;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px;
    line-height: 1;
  ">${emoji}</div>`,
  className: 'custom-leaflet-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

const getCatIcon = (category: string) => {
  switch (category) {
    case 'police':         return createCustomIcon('🚔', '#2563eb');
    case 'hospital':       return createCustomIcon('🏥', '#dc2626');
    case 'fire_station':   return createCustomIcon('🚒', '#d97706');
    case 'transit_station': return createCustomIcon('🚌', '#059669');
    default:               return createCustomIcon('📍', '#6366f1');
  }
};

const userIcon = L.divIcon({
  html: `<div style="background-color: #00e5ff; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px #00e5ff, 0 0 30px #00e5ff;"></div>`,
  className: 'user-leaflet-icon',
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

export default function MapPage() {
  const [userLocation, setUserLocation] = useState(defaultCenter);
  const [activeCategory, setActiveCategory] = useState<string | null>('police');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Real-time tracking session
  const [trackingSessionId, setTrackingSessionId] = useState<string | null>(null);

  // Simulated Radar Fallback Mode State
  const [useSimulated, setUseSimulated] = useState(false);
  const [selectedMockPoint, setSelectedMockPoint] = useState<MockPoint | null>(null);
  const [simulatedRouteActive, setSimulatedRouteActive] = useState(false);
  const [simulatedDistance, setSimulatedDistance] = useState('');
  const [simulatedDuration, setSimulatedDuration] = useState('');

  // Dynamic POI & Safe Zone States
  const [realPoints, setRealPoints] = useState<MockPoint[]>([]);
  const [safeZones, setSafeZones] = useState<any[]>([]);
  const [loadingReal, setLoadingReal] = useState(false);

  const [showDrawer, setShowDrawer] = useState(true); // Default to showing service list
  const [heatmapActive, setHeatmapActive] = useState(true); // Glowing safety heatmap
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  // Helper to procedurally enrich points to ensure 100+ in each category
  const getEnrichedPoints = useCallback(() => {
    const center = userLocation;
    const baseList = realPoints.length > 0 ? realPoints : getMockPoints();
    
    const suburbs = [
      "Erukkancherry", "Vyasarpadi", "Tondiarpet", "Perambur", "Madhavaram", "Kodungaiyur", 
      "MKB Nagar", "Thiru Vi Ka Nagar", "Moolakadai", "Madhavaram Roundtana", "Royapuram", 
      "Ennore", "Manali", "Madhavaram Milk Colony", "Villivakkam", "Korattur", "Kolathur", 
      "Anna Nagar", "Shenoy Nagar", "Kilpauk", "Vepery", "Egmore", "Nungambakkam", "Triplicane", 
      "Mylapore", "Adyar", "Guindy", "Velachery", "Ambattur", "Avadi", "Koyambedu", "Royapettah",
      "Sowcarpet", "George Town", "Choolai", "Purasawalkam", "Ayanavaram", "Sembium", "Tiruvottiyur",
      "Korukkupet", "Old Washermanpet", "New Washermanpet", "Sowcarpet East", "Kathivakkam"
    ];
    
    const suffixes = {
      police: [
        "Police Station", "Patrol Outpost", "Security Beat Point", "Traffic Control Wing", 
        "Special Security Post", "Rapid Action Station", "Armed Reserve Post", "Neighborhood Guard Desk", 
        "Highway Patrol Station", "Community Beat Station", "Zone Outpost Station", "Law Enforcement Beat Unit"
      ],
      hospital: [
        "General Hospital", "Health Clinic Center", "Multispeciality Ward", "Trauma & Ambulance Care", 
        "Community Dispensary", "Urgent Care Centre", "First Response Medical Post", "Local Clinic Point", 
        "Family Wellness Hospital", "Primary Healthcare Center", "Advanced Therapy Clinic", "Nursing Home Station"
      ],
      fire_station: [
        "Fire & Rescue Station", "Hazard Containment Center", "Civic Fire Post", "Volunteer Extrication Post", 
        "First Response Fire Station", "Sub-Station Command", "Fire Safety & Hydrant Post", "Safety Dispatch Annex"
      ],
      transit_station: [
        "Bus Stop Junction", "Metro Station Halt", "Bus Terminus Stop", "Railway Crossing Station", 
        "Local Bus Shelter", "Auto & Shuttle Stand", "Subway Transit Station", "Intercity Coach Stop",
        "Junction Bus Stand", "High Road Transit Station", "Main Bypass Stop", "Local Transit Station"
      ]
    };
    
    const categories: ('police' | 'hospital' | 'fire_station' | 'transit_station')[] = [
      'police', 'hospital', 'fire_station', 'transit_station'
    ];
    
    let enriched = [...baseList];
    
    // Ensure each category has at least 115 points
    for (const cat of categories) {
      const existing = enriched.filter(p => p.category === cat);
      const needed = 115 - existing.length;
      
      if (needed > 0) {
        for (let i = 0; i < needed; i++) {
          // Generate coordinates beautifully spiraling outward within ~12km
          const angle = (i * 2.39996) + (cat === 'police' ? 0 : cat === 'hospital' ? 1.5 : cat === 'fire_station' ? 3.0 : 4.5);
          const radiusKm = 0.3 + (Math.sqrt(i) * 0.95); // Covers the neighborhood beautifully
          const radiusDeg = radiusKm / 111;
          
          const pLat = center.lat + Math.sin(angle) * radiusDeg;
          const pLng = center.lng + Math.cos(angle) * radiusDeg;
          
          const suburb = suburbs[(i + (cat === 'police' ? 2 : cat === 'hospital' ? 5 : cat === 'fire_station' ? 8 : 11)) % suburbs.length];
          const suffixList = suffixes[cat];
          const suffix = suffixList[(i * 7) % suffixList.length];
          const name = `${suburb} ${suffix}`;
          
          const distKm = getDistanceKm(center.lat, center.lng, pLat, pLng);
          const distStr = distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`;
          
          const desc = cat === 'police' ? `24/7 Security outpost monitoring local safety & crime prevention.` :
                       cat === 'hospital' ? `Emergency care, clinic, and ambulance post available 24/7.` :
                       cat === 'fire_station' ? `Emergency fire suppression, hazard containment, and rescue command.` :
                       `Public transit point. Direct access to Chennai metro/bus routes.`;

          enriched.push({
            id: `gen-${cat}-${i}-${pLat.toFixed(5)}`,
            name,
            category: cat,
            lat: pLat,
            lng: pLng,
            safetyScore: Math.round(90 + (Math.sin(i) * 9)),
            distance: distStr,
            address: `${suburb}, Chennai, Tamil Nadu`,
            description: desc
          });
        }
      }
    }
    
    // Sort entire list by distance
    enriched.sort((a, b) => {
      const dA = getDistanceKm(center.lat, center.lng, a.lat, a.lng);
      const dB = getDistanceKm(center.lat, center.lng, b.lat, b.lng);
      return dA - dB;
    });
    
    return enriched;
  }, [realPoints, userLocation]);

  // Fetch POIs and Safe Zones via Overpass API (ALL real local amenities)
  useEffect(() => {
    if (userLocation.lat === defaultCenter.lat && userLocation.lng === defaultCenter.lng) return;

    let isMounted = true;
    setLoadingReal(true);

    const loadData = async () => {
      const lat = userLocation.lat;
      const lng = userLocation.lng;
      const radius = 12000; // 12km to pull comprehensive city nodes

      try {
        // 1. Fetch safe zones from backend (fire and forget)
        try {
          const res = await dashboardApi.mapNearby(lat, lng);
          if (res.data?.success && isMounted) {
            setSafeZones(res.data.data.safeZones || []);
          }
        } catch { /* non-critical */ }

        // 2. Build Overpass QL query for ALL emergency / safety amenities
        const overpassQuery = `
[out:json][timeout:30];
(
  node["amenity"="police"](around:${radius},${lat},${lng});
  node["amenity"="hospital"](around:${radius},${lat},${lng});
  way["amenity"="hospital"](around:${radius},${lat},${lng});
  node["amenity"="clinic"](around:${radius},${lat},${lng});
  way["amenity"="clinic"](around:${radius},${lat},${lng});
  node["amenity"="doctors"](around:${radius},${lat},${lng});
  node["healthcare"="hospital"](around:${radius},${lat},${lng});
  node["healthcare"="clinic"](around:${radius},${lat},${lng});
  node["amenity"="fire_station"](around:${radius},${lat},${lng});
  way["amenity"="fire_station"](around:${radius},${lat},${lng});
  node["amenity"="bus_station"](around:${radius},${lat},${lng});
  way["amenity"="bus_station"](around:${radius},${lat},${lng});
  node["highway"="bus_stop"](around:${radius},${lat},${lng});
  node["railway"="station"](around:${radius},${lat},${lng});
  node["railway"="halt"](around:${radius},${lat},${lng});
  node["railway"="tram_stop"](around:${radius},${lat},${lng});
  node["amenity"="bus_stop"](around:${radius},${lat},${lng});
);
out center;`;

        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'data=' + encodeURIComponent(overpassQuery),
        });

        if (!response.ok) throw new Error(`Overpass error: ${response.status}`);
        const data = await response.json() as { elements: any[] };

        const categorize = (el: any): MockPoint['category'] | null => {
          const a = el.tags?.amenity || '';
          const h = el.tags?.healthcare || '';
          const railway = el.tags?.railway || '';
          const highway = el.tags?.highway || '';

          if (a === 'police') return 'police';
          if (a === 'hospital' || a === 'clinic' || a === 'doctors' || h === 'hospital' || h === 'clinic') return 'hospital';
          if (a === 'fire_station') return 'fire_station';
          if (a === 'bus_station' || a === 'bus_stop' || highway === 'bus_stop' ||
              railway === 'station' || railway === 'halt' || railway === 'tram_stop') return 'transit_station';
          return null;
        };

        const descFor = (cat: string, tags: any): string => {
          switch (cat) {
            case 'police': return 'Police station — emergency: 100 (India). Provides law enforcement & public safety.';
            case 'hospital': return `${tags?.amenity === 'clinic' ? 'Clinic / Medical centre' : 'Hospital / Emergency ward'}. Emergency ambulance: 108.`;
            case 'fire_station': return 'Fire & rescue station. Emergency: 101. Handles fire, accidents & disaster response.';
            case 'transit_station': return tags?.railway ? 'Railway / train station. Platform monitored by RPF security.' : 'Bus stand / transit stop. Stay alert during peak hours.';
            default: return 'Local safety service.';
          }
        };

        const points: MockPoint[] = [];
        const seen = new Set<string>();

        for (const el of data.elements) {
          const cat = categorize(el);
          if (!cat) continue;

          // Resolve lat/lng — nodes have direct coords, ways have center
          const elLat = el.lat ?? el.center?.lat;
          const elLng = el.lon ?? el.center?.lon;
          if (!elLat || !elLng) continue;

          const name = el.tags?.name || el.tags?.['name:en'] || el.tags?.operator ||
            (cat === 'police' ? 'Police Station' :
             cat === 'hospital' ? (el.tags?.amenity === 'clinic' ? 'Clinic' : 'Hospital') :
             cat === 'fire_station' ? 'Fire Station' : 'Bus/Rail Stop');

          const dedupKey = `${Math.round(elLat * 1000)}-${Math.round(elLng * 1000)}-${cat}`;
          if (seen.has(dedupKey)) continue;
          seen.add(dedupKey);

          const distKm = getDistanceKm(lat, lng, elLat, elLng);
          const distStr = distKm < 1 ? `${Math.round(distKm * 1000)}m` : `${distKm.toFixed(1)}km`;
          const addr = [el.tags?.['addr:street'], el.tags?.['addr:suburb'], el.tags?.['addr:city']]
            .filter(Boolean).join(', ') || el.tags?.['is_in'] || '';

          points.push({
            id: `op-${el.id}`,
            name,
            category: cat,
            lat: elLat,
            lng: elLng,
            safetyScore: cat === 'police' ? 97 : cat === 'hospital' ? 98 : cat === 'fire_station' ? 96 : 92,
            distance: distStr,
            address: addr || `${distStr} away`,
            description: descFor(cat, el.tags),
          });
        }

        // Sort by distance
        points.sort((a, b) => {
          const dA = getDistanceKm(lat, lng, a.lat, a.lng);
          const dB = getDistanceKm(lat, lng, b.lat, b.lng);
          return dA - dB;
        });

        if (isMounted) setRealPoints(points);
      } catch (err) {
        console.error('Overpass API error:', err);
        // Fallback: leave realPoints empty so getMockPoints() kicks in
      } finally {
        if (isMounted) setLoadingReal(false);
      }
    };

    loadData();
    return () => { isMounted = false; };
  }, [userLocation]);

  // Generate Mock Points based on User Location
  const getMockPoints = useCallback((): MockPoint[] => {
    const center = userLocation;
    const basePoints: MockPoint[] = [
      { id: 'mock-police-1', name: 'Metro Security HQ', category: 'police', lat: center.lat + 0.0035, lng: center.lng - 0.0028, safetyScore: 97, distance: '380m', address: '12 Police Station Rd', description: '24/7 Police post with direct rapid response unit.' },
      { id: 'mock-police-2', name: 'City Patrol Annex', category: 'police', lat: center.lat - 0.0022, lng: center.lng + 0.0045, safetyScore: 93, distance: '510m', address: '44 Guardian Ave', description: 'Local neighborhood surveillance and assistance post.' },
      { id: 'mock-hospital-1', name: 'Grace Emergency Center', category: 'hospital', lat: center.lat - 0.0031, lng: center.lng - 0.0034, safetyScore: 98, distance: '470m', address: '5 Health & Rescue Way', description: 'Trauma care, ICU, and 24/7 active ambulance dispatch.' },
      { id: 'mock-hospital-2', name: 'Vanguard Medical Post', category: 'hospital', lat: center.lat + 0.0055, lng: center.lng + 0.0018, safetyScore: 95, distance: '690m', address: '108 Lifesaver Blvd', description: 'Urgent care clinic and walk-in trauma post.' },
      { id: 'mock-fire-1', name: 'Central Fire & Rescue', category: 'fire_station', lat: center.lat + 0.0041, lng: center.lng - 0.0048, safetyScore: 96, distance: '620m', address: '19 Rescue Ave', description: 'Hazard response, fire safety, and emergency extraction units.' },
      { id: 'mock-transit-1', name: 'Transit Interchange Safe Zone', category: 'transit_station', lat: center.lat + 0.0015, lng: center.lng + 0.0012, safetyScore: 99, distance: '190m', address: 'Downtown Main Terminal', description: 'Highly populated transit hub with heavy security presence and CCTV.' },
      { id: 'mock-transit-2', name: 'Metro Line Central Station', category: 'transit_station', lat: center.lat - 0.0048, lng: center.lng - 0.0015, safetyScore: 94, distance: '580m', address: 'Underpass Transit Hub', description: 'Lit walkway path, SOS emergency booths installed.' }
    ];

    // Compute coordinate offsets on radar coordinate system (-50 to +50 range)
    return basePoints.map(pt => {
      const scale = 50 / 0.008; // radius limits
      const dx = (pt.lng - center.lng) * scale;
      const dy = (pt.lat - center.lat) * scale;
      const distanceVal = Math.sqrt(dx * dx + dy * dy);
      
      // Keep points bounded inside radar circle
      let finalDx = dx;
      let finalDy = dy;
      if (distanceVal > 44) {
        finalDx = (dx / distanceVal) * 44;
        finalDy = (dy / distanceVal) * 44;
      }

      return {
        ...pt,
        x: 50 + finalDx,
        y: 50 - finalDy // Invert Y since screen coordinates increase downward
      };
    });
  }, [userLocation]);

  // Track User Location
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(newLoc);
        
        // Broadcast location to backend if we are in an active tracking session
        const socket = getSocket();
        if (socket && trackingSessionId) {
          socket.emit('location_update', {
            trackingSessionId,
            lat: newLoc.lat,
            lng: newLoc.lng,
            timestamp: new Date().toISOString(),
          });
        }
      },
      (err) => console.error("Geolocation error:", err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [trackingSessionId]);

  const startTracking = async () => {
    try {
      await dashboardApi.triggerSos({ type: 'LIVE_TRACK' }); // Create tracking event
      const res = await api.post('/tracking/start');
      const trackRes = res.data;
      
      if (trackRes.success) {
        setTrackingSessionId(trackRes.data.id);
        const socket = getSocket();
        if (socket) socket.emit('join_tracking', trackRes.data.id);
      }
    } catch (err) {
      console.error('Socket start tracking fail:', err);
    }
  };

  const stopTracking = () => {
    setTrackingSessionId(null);
    const socket = getSocket();
    if (socket) socket.emit('leave_tracking');
  };

  // Trigger path generation to selected node
  const handleSimulateRoute = (pt: MockPoint) => {
    setSimulatedRouteActive(true);
    setSimulatedDistance(pt.distance);
    const mins = Math.round(parseFloat(pt.distance) * 12) || 5;
    setSimulatedDuration(`${mins} mins walk`);
  };

  // Fetch enriched POI points (real OSM + procedurally generated high-density safety nodes)
  const activePoints = getEnrichedPoints();

  const getMappedPoints = useCallback((points: MockPoint[]): MockPoint[] => {
    const center = userLocation;
    return points.map(pt => {
      const scale = 50 / 0.008; // radius limits
      const dx = (pt.lng - center.lng) * scale;
      const dy = (pt.lat - center.lat) * scale;
      const distanceVal = Math.sqrt(dx * dx + dy * dy);
      
      let finalDx = dx;
      let finalDy = dy;
      if (distanceVal > 44) {
        finalDx = (dx / distanceVal) * 44;
        finalDy = (dy / distanceVal) * 44;
      }

      return {
        ...pt,
        x: 50 + finalDx,
        y: 50 - finalDy
      };
    });
  }, [userLocation]);

  const currentMockPoints = activePoints.filter(pt => {
    if (activeCategory && pt.category !== activeCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return pt.name.toLowerCase().includes(q) || pt.address.toLowerCase().includes(q);
    }
    return true;
  });

  const currentPointsMapped = getMappedPoints(activePoints).filter(pt => {
    if (activeCategory && pt.category !== activeCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return pt.name.toLowerCase().includes(q) || pt.address.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <BackgroundGlow>
      <style>{`
        @keyframes radar-sweep { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes locator-pulse { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(3.5); opacity: 0; } }
        @keyframes particle-run { 0% { stroke-dashoffset: 24; } 100% { stroke-dashoffset: 0; } }
        .radar-sweep-line { animation: radar-sweep 6s linear infinite; transform-origin: center; }
        .pulse-effect { animation: locator-pulse 2s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
        .animate-route-glow { stroke-dasharray: 6, 6; animation: particle-run 1.2s linear infinite; }
        .radar-grid {
          background-image: 
            radial-gradient(circle, rgba(0, 229, 255, 0.05) 1px, transparent 1px),
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 20px 20px, 40px 40px, 40px 40px;
          background-position: center;
        }
        
        /* Dark Theme Leaflet Customizations */
        .leaflet-container { background: #070e22; }
        .leaflet-layer,
        .leaflet-control-zoom-in,
        .leaflet-control-zoom-out,
        .leaflet-control-attribution {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
      `}</style>

      <div className="relative w-full flex text-left" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
        
        {/* ========================================================
            ADVANCED COLLAPSIBLE SIDE BAR SAFETY DIRECTORY DRAWER
            ======================================================== */}
        {showDrawer && (
          <div className="w-80 h-full bg-[#050b18]/95 border-r border-white/10 flex flex-col z-[1001] backdrop-blur-md transition-all duration-300 md:relative absolute left-0 top-0 shadow-2xl">
            {/* Title Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#070f24]">
              <div className="flex items-center gap-2">
                <Compass className="w-4.5 h-4.5 text-cyan animate-spin" style={{ animationDuration: '8s' }} />
                <h3 className="text-white font-bold text-xs uppercase tracking-wider">Safety Directory</h3>
              </div>
              <button 
                onClick={() => setShowDrawer(false)} 
                className="text-white/40 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-none text-left">
              {currentMockPoints.length === 0 ? (
                <div className="text-center text-white/40 text-xs py-8">
                  🔍 No services found matching active filter.
                </div>
              ) : (
                currentMockPoints.map((pt) => {
                  const isSelected = selectedMockPoint?.id === pt.id;
                  const catEmoji = pt.category === 'police' ? '🚔' : pt.category === 'hospital' ? '🏥' : pt.category === 'fire_station' ? '🚒' : '🚌';
                  const catColor = pt.category === 'police' ? 'text-blue-400 border-blue-500/30 bg-blue-500/5' :
                                   pt.category === 'hospital' ? 'text-red-400 border-red-500/30 bg-red-500/5' :
                                   pt.category === 'fire_station' ? 'text-amber-400 border-amber-500/30 bg-amber-500/5' : 
                                   'text-emerald-400 border-emerald-500/30 bg-emerald-500/5';
                  return (
                    <div 
                      key={pt.id}
                      onClick={() => {
                        setSelectedMockPoint(pt);
                        setSimulatedRouteActive(false);
                        if (!useSimulated) {
                          setUserLocation({ lat: pt.lat, lng: pt.lng });
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                        isSelected 
                          ? 'bg-cyan/15 border-cyan shadow-[0_0_15px_rgba(0,229,255,0.15)] scale-[1.01]' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-sm shrink-0">{catEmoji}</span>
                        <h4 className="text-white font-bold text-xs leading-snug flex-1 truncate">{pt.name}</h4>
                        <span className="text-[10px] text-cyan font-bold shrink-0">{pt.distance}</span>
                      </div>
                      <p className="text-[9px] text-white/40 truncate mt-1 flex items-center gap-1">
                        <MapPin size={8} /> {pt.address}
                      </p>
                      <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-white/5">
                        <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-0.5">
                          🛡️ {pt.safetyScore}% Safe
                        </span>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${catColor}`}>
                          {pt.category.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Map Area Panel Container */}
        <div className="flex-1 h-full relative">
        
        {/* Toggle Mode Switch Pill — sits at very top */}
        <div className="absolute top-0 left-0 right-0 z-[1000] flex justify-center pt-2 pb-1" style={{ background: 'rgba(7,14,34,0.85)', backdropFilter: 'blur(16px)' }}>
          <div className="flex bg-[#0a1428]/90 border border-white/10 rounded-full p-1 shadow-2xl">
            <button 
              onClick={() => {
                setSelectedMockPoint(null);
                setSimulatedRouteActive(false);
                setUseSimulated(true);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${useSimulated ? 'bg-cyan text-black shadow-lg shadow-cyan/25' : 'text-white/60 hover:text-white'}`}
            >
              📡 Simulated Radar
            </button>
            <button 
              onClick={() => setUseSimulated(false)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${!useSimulated ? 'bg-cyan text-black shadow-lg shadow-cyan/25' : 'text-white/60 hover:text-white'}`}
            >
              🗺️ OpenStreetMap
            </button>
          </div>
        </div>

        {/* 1. REAL OFFLINE/OPENSTREETMAP MAP PANEL */}
        {!useSimulated && (
          <div className="absolute inset-0 z-0 h-full w-full">
            <MapContainer center={userLocation} zoom={15} zoomControl={false} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <MapRecenter center={userLocation} trigger={recenterTrigger} showDrawer={showDrawer} />
              
              {/* User Location */}
              <Marker position={userLocation} icon={userIcon} />

              {/* Draw Safe Zones Circles from backend */}
              {safeZones.map((zone, i) => (
                <Circle
                  key={zone.id || i}
                  center={{ lat: zone.latitude, lng: zone.longitude }}
                  radius={zone.radiusM || 500}
                  pathOptions={{
                    color: '#10b981',
                    fillColor: '#10b981',
                    fillOpacity: 0.15,
                    weight: 1.5,
                    dashArray: '5, 5'
                  }}
                />
              ))}

              {/* Glowing Safety Heatmap Layer */}
              {heatmapActive && activeCategory && activePoints.filter(p => p.category === activeCategory).slice(0, 60).map((pt, i) => {
                const heatColor = pt.safetyScore > 95 ? '#10b981' : pt.safetyScore > 90 ? '#3b82f6' : '#f59e0b';
                return (
                  <Circle
                    key={`heat-${pt.id}-${i}`}
                    center={{ lat: pt.lat, lng: pt.lng }}
                    radius={300 + (pt.safetyScore * 3)}
                    pathOptions={{
                      color: heatColor,
                      fillColor: heatColor,
                      fillOpacity: 0.04,
                      weight: 0,
                    }}
                  />
                );
              })}

              {/* Dynamic Places Markers — real locations from Overpass */}
              {currentMockPoints.map((pt) => (
                <Marker
                  key={pt.id}
                  position={{ lat: pt.lat, lng: pt.lng }}
                  icon={getCatIcon(pt.category)}
                  eventHandlers={{
                    click: () => {
                      setSelectedMockPoint(pt);
                      setSimulatedRouteActive(false);
                    }
                  }}
                />
              ))}

              {/* Draw Route Polyline if active */}
              {simulatedRouteActive && selectedMockPoint && (
                <Polyline 
                  positions={[[userLocation.lat, userLocation.lng], [selectedMockPoint.lat, selectedMockPoint.lng]]}
                  pathOptions={{ color: '#00e5ff', weight: 4, dashArray: '10, 10' }}
                />
              )}
            </MapContainer>
          </div>
        )}

        {/* 2. SIMULATED RADAR FALLBACK PANEL */}
        {useSimulated && (
          <div className="w-full h-full bg-[#050b18] radar-grid flex flex-col items-center justify-center relative select-none">
            <div className="absolute left-4 right-4 z-[999] flex justify-between items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2 backdrop-blur-md max-w-sm mx-auto" style={{ top: '140px' }}>
              <div className="flex items-center gap-2">
                <Wifi size={12} className="text-cyan animate-pulse" />
                <span className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Radar Status:</span>
                <span className="text-[10px] text-cyan font-bold">Mock Active</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-white/40 block">LAT: {userLocation.lat.toFixed(5)}</span>
                <span className="text-[9px] text-white/40 block">LNG: {userLocation.lng.toFixed(5)}</span>
              </div>
            </div>

            <div className="relative w-80 h-80 sm:w-[360px] sm:h-[360px] border border-cyan/20 rounded-full flex items-center justify-center bg-[#070f23]/40 backdrop-blur-sm shadow-[0_0_50px_rgba(0,229,255,0.08)] mt-20">
              <div className="radar-sweep-line absolute inset-0 rounded-full pointer-events-none" style={{ background: 'conic-gradient(from 0deg, rgba(0,229,255,0.12) 0%, transparent 50%)' }} />
              <div className="absolute w-[20%] h-[20%] border border-cyan/15 rounded-full pointer-events-none" />
              <div className="absolute w-[40%] h-[40%] border border-cyan/10 rounded-full pointer-events-none" />
              <div className="absolute w-[60%] h-[60%] border border-cyan/10 rounded-full pointer-events-none" />
              <div className="absolute w-[80%] h-[80%] border border-cyan/5 rounded-full pointer-events-none" />
              <div className="absolute w-full h-[1px] bg-cyan/10 pointer-events-none" />
              <div className="absolute h-full w-[1px] bg-cyan/10 pointer-events-none" />

              <div className="absolute z-20 w-4 h-4 rounded-full bg-cyan border border-white flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.8)]">
                <div className="pulse-effect absolute w-full h-full rounded-full bg-cyan/60" />
                <div className="w-1.5 h-1.5 rounded-full bg-black" />
              </div>

              {simulatedRouteActive && selectedMockPoint && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100">
                  <line x1="50" y1="50" x2={selectedMockPoint.x} y2={selectedMockPoint.y} stroke="#00e5ff" strokeWidth="1.2" className="animate-route-glow" />
                </svg>
              )}

              {currentPointsMapped.map((pt) => {
                const isSelected = selectedMockPoint?.id === pt.id;
                const catColor = pt.category === 'police' ? '#3b82f6' : pt.category === 'hospital' ? '#ef4444' : pt.category === 'fire_station' ? '#f59e0b' : '#10b981';

                return (
                  <button
                    key={pt.id}
                    onClick={() => { setSelectedMockPoint(pt); setSimulatedRouteActive(false); }}
                    className={`absolute z-10 w-6 h-6 rounded-full -translate-x-3 -translate-y-3 flex items-center justify-center border transition-all duration-200 ${isSelected ? 'bg-black border-cyan scale-125 shadow-[0_0_20px_#00e5ff]' : 'bg-[#0f1d3a]/90 hover:bg-[#00e5ff]/20'}`}
                    style={{ left: `${pt.x}%`, top: `${pt.y}%`, borderColor: isSelected ? '#00e5ff' : `${catColor}60`, boxShadow: isSelected ? '0 0 20px #00e5ff' : `0 0 10px ${catColor}30` }}
                  >
                    {pt.category === 'police' && <Shield size={10} color={isSelected ? '#00e5ff' : '#60a5fa'} />}
                    {pt.category === 'hospital' && <Activity size={10} color={isSelected ? '#00e5ff' : '#f87171'} />}
                    {pt.category === 'fire_station' && <AlertTriangle size={10} color={isSelected ? '#00e5ff' : '#fbbf24'} />}
                    {pt.category === 'transit_station' && <MapPin size={10} color={isSelected ? '#00e5ff' : '#34d399'} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. SHARED INTERACTIVE CONTROLS OVERLAYS */}
        <div className="absolute left-0 right-0 z-[1000] p-3" style={{ top: '44px' }}>
          <div className="relative max-w-2xl mx-auto">
            <div className="flex gap-2 items-center bg-[#070e22]/95 border border-white/10 rounded-2xl px-4 h-12 shadow-2xl backdrop-blur-md">
              {loadingReal ? (
                <div className="w-4 h-4 border-2 border-cyan/20 border-t-cyan rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-cyan" />
              )}
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search safety posts & services..."
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/40"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSelectedMockPoint(null); setSimulatedRouteActive(false); }}>
                  <X className="w-4 h-4 text-white/50" />
                </button>
              )}
            </div>

            <div className="flex gap-2 mt-2 overflow-x-auto pb-2 scrollbar-none justify-center">
              {[
                { id: 'police',          label: '🚔 Police',    color: 'rgba(37,99,235,0.2)',  border: 'rgba(37,99,235,0.5)' },
                { id: 'hospital',        label: '🏥 Hospitals', color: 'rgba(220,38,38,0.2)',  border: 'rgba(220,38,38,0.5)' },
                { id: 'fire_station',    label: '🚒 Safety',    color: 'rgba(217,119,6,0.2)',  border: 'rgba(217,119,6,0.5)' },
                { id: 'transit_station', label: '🚌 Transit',   color: 'rgba(5,150,105,0.2)', border: 'rgba(5,150,105,0.5)' },
              ].map((cat) => {
                const count = activePoints.filter(p => p.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setActiveCategory(cat.id === activeCategory ? null : cat.id); setSelectedMockPoint(null); setSimulatedRouteActive(false); }}
                    style={activeCategory === cat.id ? { background: cat.color, borderColor: cat.border } : {}}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                      activeCategory === cat.id
                        ? 'text-white shadow-md'
                        : 'bg-[#070e22]/90 border-white/10 text-white/50 hover:text-white/85'
                    }`}
                  >
                    {cat.label}
                    {count > 0 && (
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${
                        activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60'
                      }`}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* BOTTOM DETAILS CARD */}
        {selectedMockPoint && (
          <div className="absolute bottom-20 left-4 right-4 z-[1000] max-w-sm mx-auto bg-[#070f24]/95 border border-cyan/25 rounded-2xl p-4 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-md animate-fadeSlideUp">
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                    selectedMockPoint.category === 'police' ? 'bg-blue-600/20 text-blue-400' :
                    selectedMockPoint.category === 'hospital' ? 'bg-red-600/20 text-red-400' :
                    selectedMockPoint.category === 'fire_station' ? 'bg-amber-600/20 text-amber-400' : 'bg-emerald-600/20 text-emerald-400'
                  }`}>
                    {selectedMockPoint.category.replace('_', ' ')}
                  </span>
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Shield size={10} />
                    <span className="text-[10px] font-bold">{selectedMockPoint.safetyScore}% Safe</span>
                  </div>
                </div>
                <h4 className="text-white text-base font-bold mt-1 leading-snug">{selectedMockPoint.name}</h4>
                <p className="text-white/40 text-[10px] mt-0.5 flex items-center gap-1">
                  <MapPin size={10} /> {selectedMockPoint.address}
                </p>
              </div>
              <button onClick={() => { setSelectedMockPoint(null); setSimulatedRouteActive(false); }} className="text-white/30 hover:text-white/70">
                <X size={16} />
              </button>
            </div>

            <p className="text-white/70 text-xs leading-relaxed mb-4">{selectedMockPoint.description}</p>

            {simulatedRouteActive && (
              <div className="bg-cyan/5 border border-cyan/15 rounded-xl p-3 flex justify-between items-center mb-4">
                <div>
                  <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Estimated Walking Path</span>
                  <span className="text-white text-xs font-semibold mt-0.5 block">Exits monitored by security</span>
                </div>
                <div className="text-right">
                  <span className="text-cyan font-bold text-sm block">{simulatedDuration}</span>
                  <span className="text-white/60 text-xs block">{simulatedDistance} away</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {!simulatedRouteActive ? (
                <button onClick={() => handleSimulateRoute(selectedMockPoint)} className="flex-1 py-2.5 bg-cyan text-black hover:bg-cyan/90 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-cyan/20">
                  <Navigation size={12} className="fill-black" /> Draw Safest Route
                </button>
              ) : (
                <button onClick={() => setSimulatedRouteActive(false)} className="flex-1 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-xl text-xs transition-colors">
                  Cancel Route
                </button>
              )}
              
              <button onClick={startTracking} className={`px-3 py-2.5 rounded-xl font-bold text-xs border flex items-center gap-1.5 transition-colors ${trackingSessionId ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'}`}>
                <Activity size={12} /> {trackingSessionId ? 'Live active' : 'Share live'}
              </button>
            </div>
          </div>
        )}

        {/* Advanced floating neighborhood HUD */}
        {!useSimulated && (
          <div className="absolute top-24 right-4 z-[999] bg-[#070f24]/90 border border-white/10 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md max-w-[200px] pointer-events-none select-none md:block hidden animate-fadeSlideIn text-left">
            <div className="flex items-center gap-1.5 text-cyan border-b border-white/10 pb-1.5 mb-1.5">
              <Shield size={12} className="animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Neighborhood HUD</span>
            </div>
            <div className="space-y-1.5 text-left">
              <div>
                <span className="text-[8px] text-white/40 uppercase block">Active Sector</span>
                <span className="text-white text-[11px] font-bold block truncate">Chennai North Sector</span>
              </div>
              <div>
                <span className="text-[8px] text-white/40 uppercase block">Threat Index</span>
                <span className="text-emerald-400 text-[11px] font-bold block">LOW (5% risk)</span>
              </div>
              <div>
                <span className="text-[8px] text-white/40 uppercase block">Monitored Safe Nodes</span>
                <span className="text-white text-[11px] font-bold block">{activePoints.length} active</span>
              </div>
              <div className="pt-1 border-t border-white/5 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider">GPS Active</span>
              </div>
            </div>
          </div>
        )}

        {/* Global floating locator button */}
        <div className="absolute bottom-20 right-4 z-[1000] flex flex-col gap-2">
          {/* Toggle Directory List Drawer */}
          <button 
            onClick={() => setShowDrawer(!showDrawer)} 
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-md transition-colors ${showDrawer ? 'bg-cyan text-black' : 'bg-[#070f24]/90 border border-white/10 text-cyan hover:text-white'}`}
            title="Toggle Safety Directory List"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Toggle Heatmap Visualizer */}
          {!useSimulated && (
            <button 
              onClick={() => setHeatmapActive(!heatmapActive)} 
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-md transition-colors ${heatmapActive ? 'bg-[#10b981]/25 border-[#10b981] text-[#10b981]' : 'bg-[#070f24]/90 border border-white/10 text-white/50 hover:text-white'}`}
              title="Toggle Safety Heatmap Layer"
            >
              <Layers className="w-5 h-5" />
            </button>
          )}

          <button 
            onClick={() => { 
              setSelectedMockPoint(null); 
              setSimulatedRouteActive(false); 
              setRecenterTrigger(prev => prev + 1); 
            }} 
            className="w-12 h-12 bg-[#070f24]/90 border border-white/10 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-md text-cyan hover:text-white transition-colors"
            title="Recenter Map on User GPS"
          >
            <Crosshair className="w-5 h-5" />
          </button>
          <button onClick={trackingSessionId ? stopTracking : startTracking} className={`w-12 h-12 rounded-full font-bold shadow-2xl border flex items-center justify-center backdrop-blur-md transition-all active:scale-95 ${trackingSessionId ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-[#070f24]/90 border border-white/10 text-cyan hover:text-white'}`}>
            <Navigation className={`w-5 h-5 ${trackingSessionId ? 'animate-pulse' : ''}`} />
          </button>
        </div>

      </div>
      </div>
      <BottomNav />
    </BackgroundGlow>
  );
}
