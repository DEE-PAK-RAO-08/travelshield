import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Search, Crosshair, Navigation, X, MapPin, Shield, Activity, Wifi, AlertTriangle
} from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { BottomNav } from '@/components/layout/BottomNav';
import { dashboardApi } from '@/api/client';
import { getSocket } from '@/api/socket';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';

const libraries: ("places" | "geometry")[] = ['places', 'geometry'];
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = { lat: 28.6139, lng: 77.2090 };

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

export default function MapPage() {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [userLocation, setUserLocation] = useState(defaultCenter);
  const [destination, setDestination] = useState<{ lat: number; lng: number; name: string } | null>(null);
  
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [places, setPlaces] = useState<google.maps.places.PlaceResult[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>('police');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [autocompleteResults, setAutocompleteResults] = useState<google.maps.places.AutocompletePrediction[]>([]);
  
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  
  // Real-time tracking session
  const [trackingSessionId, setTrackingSessionId] = useState<string | null>(null);

  // Simulated Radar Fallback Mode State
  const [useSimulated, setUseSimulated] = useState(!GOOGLE_MAPS_API_KEY || !!loadError);
  const [selectedMockPoint, setSelectedMockPoint] = useState<MockPoint | null>(null);
  const [simulatedRouteActive, setSimulatedRouteActive] = useState(false);
  const [simulatedDistance, setSimulatedDistance] = useState('');
  const [simulatedDuration, setSimulatedDuration] = useState('');

  // Automatically switch to simulated mode if maps fail to load
  useEffect(() => {
    if (loadError) {
      console.warn("Google Maps failed to load. Falling back to Simulated Radar.");
      setUseSimulated(true);
    }
  }, [loadError]);

  // Generate Mock Points based on User Location
  const getMockPoints = useCallback((): MockPoint[] => {
    const center = userLocation;
    const basePoints: MockPoint[] = [
      {
        id: 'mock-police-1',
        name: 'Metro Security HQ',
        category: 'police',
        lat: center.lat + 0.0035,
        lng: center.lng - 0.0028,
        safetyScore: 97,
        distance: '380m',
        address: '12 Police Station Rd, Sector 1',
        description: '24/7 Police post with direct rapid response unit.',
      },
      {
        id: 'mock-police-2',
        name: 'City Patrol Annex',
        category: 'police',
        lat: center.lat - 0.0022,
        lng: center.lng + 0.0045,
        safetyScore: 93,
        distance: '510m',
        address: '44 Guardian Ave, Junction East',
        description: 'Local neighborhood surveillance and assistance post.',
      },
      {
        id: 'mock-hospital-1',
        name: 'Grace Emergency Center',
        category: 'hospital',
        lat: center.lat - 0.0031,
        lng: center.lng - 0.0034,
        safetyScore: 98,
        distance: '470m',
        address: '5 Health & Rescue Way, Central Circle',
        description: 'Trauma care, ICU, and 24/7 active ambulance dispatch.',
      },
      {
        id: 'mock-hospital-2',
        name: 'Vanguard Medical Post',
        category: 'hospital',
        lat: center.lat + 0.0055,
        lng: center.lng + 0.0018,
        safetyScore: 95,
        distance: '690m',
        address: '108 Lifesaver Blvd',
        description: 'Urgent care clinic and walk-in trauma post.',
      },
      {
        id: 'mock-fire-1',
        name: 'Central Fire & Rescue',
        category: 'fire_station',
        lat: center.lat + 0.0041,
        lng: center.lng - 0.0048,
        safetyScore: 96,
        distance: '620m',
        address: '19 Rescue Ave',
        description: 'Hazard response, fire safety, and emergency extraction units.',
      },
      {
        id: 'mock-transit-1',
        name: 'Transit Interchange Safe Zone',
        category: 'transit_station',
        lat: center.lat + 0.0015,
        lng: center.lng + 0.0012,
        safetyScore: 99,
        distance: '190m',
        address: 'Downtown Main Terminal',
        description: 'Highly populated transit hub with heavy security presence and CCTV.',
      },
      {
        id: 'mock-transit-2',
        name: 'Metro Line Central Station',
        category: 'transit_station',
        lat: center.lat - 0.0048,
        lng: center.lng - 0.0015,
        safetyScore: 94,
        distance: '580m',
        address: 'Underpass Transit Hub',
        description: 'Lit walkway path, SOS emergency booths installed.',
      }
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

  // Google Maps: Initialize Map Services
  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    placesService.current = new window.google.maps.places.PlacesService(mapInstance);
    autocompleteService.current = new window.google.maps.places.AutocompleteService();
  }, []);

  // Google Maps: Search places when category changes
  useEffect(() => {
    if (!isLoaded || !map || !placesService.current || !activeCategory || useSimulated) return;
    const request = {
      location: userLocation,
      radius: 5000,
      keyword: activeCategory
    };
    placesService.current.nearbySearch(request, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        setPlaces(results);
      }
    });
  }, [isLoaded, map, activeCategory, userLocation, useSimulated]);

  // Google Maps: Calculate Route
  const calculateRoute = async () => {
    if (!destination) return;
    const directionsService = new window.google.maps.DirectionsService();
    try {
      const results = await directionsService.route({
        origin: userLocation,
        destination: destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      });
      setDirectionsResponse(results);
      setDistance(results.routes[0].legs[0].distance?.text || '');
      setDuration(results.routes[0].legs[0].duration?.text || '');
    } catch (err) {
      console.error("Directions request failed", err);
    }
  };

  useEffect(() => {
    if (destination && !useSimulated) calculateRoute();
    else setDirectionsResponse(null);
  }, [destination, useSimulated]);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (useSimulated) return; // Search handled locally in UI

    if (!val || !autocompleteService.current) {
      setAutocompleteResults([]);
      return;
    }
    autocompleteService.current.getPlacePredictions({ input: val }, (preds, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && preds) {
        setAutocompleteResults(preds);
      }
    });
  };

  const handleSelectPlace = (placeId: string, description: string) => {
    if (!placesService.current || !map) return;
    setSearchQuery(description);
    setAutocompleteResults([]);
    
    placesService.current.getDetails({ placeId }, (place, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
        const dest = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          name: place.name || description,
        };
        setDestination(dest);
        map.panTo(dest);
      }
    });
  };

  const startTracking = async () => {
    try {
      await dashboardApi.triggerSos({ type: 'LIVE_TRACK' }); // Create tracking event
      const trackRes = await fetch(import.meta.env.VITE_API_URL + '/tracking/start', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + localStorage.getItem('accessToken') }
      }).then(r => r.json());
      
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

  // Simulated: Trigger path generation to selected node
  const handleSimulateRoute = (pt: MockPoint) => {
    setSimulatedRouteActive(true);
    // Generate realistic distances
    setSimulatedDistance(pt.distance);
    const mins = Math.round(parseFloat(pt.distance) * 12) || 5;
    setSimulatedDuration(`${mins} mins walk`);
  };

  // Fetch mock points filtered by current category & search text
  const currentMockPoints = getMockPoints().filter(pt => {
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
        @keyframes radar-sweep {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes locator-pulse {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(3.5); opacity: 0; }
        }
        @keyframes particle-run {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
        .radar-sweep-line {
          animation: radar-sweep 6s linear infinite;
          transform-origin: center;
        }
        .pulse-effect {
          animation: locator-pulse 2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }
        .animate-route-glow {
          stroke-dasharray: 6, 6;
          animation: particle-run 1.2s linear infinite;
        }
        .radar-grid {
          background-image: 
            radial-gradient(circle, rgba(0, 229, 255, 0.05) 1px, transparent 1px),
            linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
          background-size: 20px 20px, 40px 40px, 40px 40px;
          background-position: center;
        }
      `}</style>

      <div className="relative w-full" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
        
        {/* Toggle Mode Switch Pill */}
        <div className="absolute top-16 left-0 right-0 z-30 flex justify-center">
          <div className="flex bg-[#070e22]/95 border border-white/10 rounded-full p-1 shadow-2xl backdrop-blur-md">
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
              onClick={() => {
                if (!GOOGLE_MAPS_API_KEY) {
                  alert("Google Maps API Key is missing. Please set VITE_GOOGLE_MAPS_API_KEY to enable Google Maps mode.");
                  return;
                }
                setUseSimulated(false);
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${!useSimulated ? 'bg-cyan text-black shadow-lg shadow-cyan/25' : 'text-white/60 hover:text-white'}`}
            >
              🗺️ Google Maps
            </button>
          </div>
        </div>

        {/* 1. GOOGLE MAPS PANEL */}
        {!useSimulated && isLoaded && (
          <>
            {!GOOGLE_MAPS_API_KEY && (
              <div className="absolute top-28 left-4 right-4 z-20 bg-red-500/90 text-white p-3 rounded-xl border border-red-400 text-sm">
                <b>Missing API Key:</b> Please add VITE_GOOGLE_MAPS_API_KEY to your environment to enable full map functionality.
              </div>
            )}

            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              zoom={14}
              center={userLocation}
              options={{
                styles: [
                  { elementType: "geometry", stylers: [{ color: "#0d1b3e" }] },
                  { elementType: "labels.text.stroke", stylers: [{ color: "#0d1b3e" }] },
                  { elementType: "labels.text.fill", stylers: [{ color: "#00e5ff" }] },
                  { featureType: "water", elementType: "geometry", stylers: [{ color: "#060d21" }] }
                ],
                disableDefaultUI: true,
                zoomControl: true,
              }}
              onLoad={onLoad}
              onUnmount={() => setMap(null)}
            >
              {/* User Marker */}
              <Marker position={userLocation} icon={{ url: '/shield.svg', scaledSize: new window.google.maps.Size(30, 30) }} />

              {/* Places Markers */}
              {places.map((place, i) => (
                place.geometry?.location && (
                  <Marker 
                    key={i} 
                    position={{ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }}
                    onClick={() => setDestination({ lat: place.geometry!.location!.lat(), lng: place.geometry!.location!.lng(), name: place.name! })}
                    icon={{
                      path: window.google.maps.SymbolPath.CIRCLE,
                      fillColor: activeCategory === 'police' ? '#3b82f6' : '#f59e0b',
                      fillOpacity: 0.9,
                      strokeWeight: 2,
                      strokeColor: '#ffffff',
                      scale: 8
                    }}
                  />
                )
              ))}

              {/* Route Renderer */}
              {directionsResponse && (
                <DirectionsRenderer directions={directionsResponse} options={{ suppressMarkers: false, polylineOptions: { strokeColor: '#00e5ff', strokeWeight: 5 } }} />
              )}
            </GoogleMap>
          </>
        )}

        {/* 2. SIMULATED RADAR FALLBACK PANEL */}
        {useSimulated && (
          <div className="w-full h-full bg-[#050b18] radar-grid flex flex-col items-center justify-center relative select-none">
            {/* Top Indicator bar */}
            <div className="absolute top-28 left-4 right-4 z-20 flex justify-between items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2 backdrop-blur-md max-w-sm mx-auto">
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

            {/* Simulated Radar Circular Screen */}
            <div className="relative w-80 h-80 sm:w-[360px] sm:h-[360px] border border-cyan/20 rounded-full flex items-center justify-center bg-[#070f23]/40 backdrop-blur-sm shadow-[0_0_50px_rgba(0,229,255,0.08)]">
              {/* Radar Sweeping Overlay */}
              <div className="radar-sweep-line absolute inset-0 rounded-full pointer-events-none" style={{
                background: 'conic-gradient(from 0deg, rgba(0,229,255,0.12) 0%, transparent 50%)'
              }} />

              {/* Concentric rings */}
              <div className="absolute w-[20%] h-[20%] border border-cyan/15 rounded-full pointer-events-none" />
              <div className="absolute w-[40%] h-[40%] border border-cyan/10 rounded-full pointer-events-none" />
              <div className="absolute w-[60%] h-[60%] border border-cyan/10 rounded-full pointer-events-none" />
              <div className="absolute w-[80%] h-[80%] border border-cyan/5 rounded-full pointer-events-none" />
              
              {/* Axis Crosshairs */}
              <div className="absolute w-full h-[1px] bg-cyan/10 pointer-events-none" />
              <div className="absolute h-full w-[1px] bg-cyan/10 pointer-events-none" />

              {/* User Center Pulse locator */}
              <div className="absolute z-20 w-4 h-4 rounded-full bg-cyan border border-white flex items-center justify-center shadow-[0_0_15px_rgba(0,229,255,0.8)]">
                <div className="pulse-effect absolute w-full h-full rounded-full bg-cyan/60" />
                <div className="w-1.5 h-1.5 rounded-full bg-black" />
              </div>

              {/* SVG Dotted Navigation Route */}
              {simulatedRouteActive && selectedMockPoint && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100">
                  <line
                    x1="50"
                    y1="50"
                    x2={selectedMockPoint.x}
                    y2={selectedMockPoint.y}
                    stroke="#00e5ff"
                    strokeWidth="1.2"
                    className="animate-route-glow"
                  />
                </svg>
              )}

              {/* Mock Points Markers */}
              {currentMockPoints.map((pt) => {
                const isSelected = selectedMockPoint?.id === pt.id;
                
                // Color mapping
                const catColor = 
                  pt.category === 'police' ? '#3b82f6' : 
                  pt.category === 'hospital' ? '#ef4444' : 
                  pt.category === 'fire_station' ? '#f59e0b' : '#10b981';

                return (
                  <button
                    key={pt.id}
                    onClick={() => {
                      setSelectedMockPoint(pt);
                      setSimulatedRouteActive(false); // Reset path until recalculate clicked
                    }}
                    className={`absolute z-10 w-6 h-6 rounded-full -translate-x-3 -translate-y-3 flex items-center justify-center border transition-all duration-200 ${
                      isSelected 
                        ? 'bg-black border-cyan scale-125 shadow-[0_0_20px_#00e5ff]' 
                        : 'bg-[#0f1d3a]/90 hover:bg-[#00e5ff]/20'
                    }`}
                    style={{
                      left: `${pt.x}%`,
                      top: `${pt.y}%`,
                      borderColor: isSelected ? '#00e5ff' : `${catColor}60`,
                      boxShadow: isSelected ? '0 0 20px #00e5ff' : `0 0 10px ${catColor}30`
                    }}
                  >
                    {pt.category === 'police' && <Shield size={10} color={isSelected ? '#00e5ff' : '#60a5fa'} />}
                    {pt.category === 'hospital' && <Activity size={10} color={isSelected ? '#00e5ff' : '#f87171'} />}
                    {pt.category === 'fire_station' && <AlertTriangle size={10} color={isSelected ? '#00e5ff' : '#fbbf24'} />}
                    {pt.category === 'transit_station' && <MapPin size={10} color={isSelected ? '#00e5ff' : '#34d399'} />}
                  </button>
                );
              })}
            </div>

            {/* Outer radar warning text */}
            <p className="text-[10px] text-white/30 text-center max-w-[240px] leading-relaxed mt-4">
              Radar scans active 10km grid. GPS updates broadcast every 5s during active share.
            </p>
          </div>
        )}

        {/* 3. SHARED INTERACTIVE CONTROLS OVERLAYS */}

        {/* Top Search bar input */}
        <div className="absolute top-0 left-0 right-0 z-20 p-3">
          <div className="relative max-w-2xl mx-auto">
            <div className="flex gap-2 items-center bg-[#070e22]/95 border border-white/10 rounded-2xl px-4 h-12 shadow-2xl backdrop-blur-md">
              <Search className="w-4 h-4 text-cyan" />
              <input
                value={searchQuery}
                onChange={handleSearchInput}
                placeholder={useSimulated ? "Search simulated safety posts..." : "Search Google Maps..."}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/40"
              />
              {searchQuery && (
                <button onClick={() => { 
                  setSearchQuery(''); 
                  setAutocompleteResults([]); 
                  setDestination(null); 
                  setSelectedMockPoint(null);
                  setSimulatedRouteActive(false);
                }}>
                  <X className="w-4 h-4 text-white/50" />
                </button>
              )}
            </div>

            {/* Google Places autocomplete list */}
            {autocompleteResults.length > 0 && !useSimulated && (
              <div className="absolute top-14 left-0 right-0 bg-[#0d1b3e]/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl max-h-60 overflow-y-auto">
                {autocompleteResults.map((res) => (
                  <button
                    key={res.place_id}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 text-white text-sm flex items-center gap-3"
                    onClick={() => handleSelectPlace(res.place_id, res.description)}
                  >
                    <MapPin className="w-4 h-4 text-cyan opacity-50" />
                    <span className="truncate">{res.description}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Shared Category filter chips */}
            <div className="flex gap-2 mt-2 overflow-x-auto pb-2 scrollbar-none justify-center">
              {[
                { id: 'police', label: 'Police Stations' },
                { id: 'hospital', label: 'Hospitals' },
                { id: 'fire_station', label: 'Safety Services' },
                { id: 'transit_station', label: 'Safe Transit' }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id === activeCategory ? null : cat.id);
                    setSelectedMockPoint(null);
                    setSimulatedRouteActive(false);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize border transition-all ${
                    activeCategory === cat.id 
                      ? 'bg-cyan/20 border-cyan text-white shadow-md shadow-cyan/10' 
                      : 'bg-[#070e22]/90 border-white/10 text-white/50 hover:text-white/85'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM DETAILS CARD */}

        {/* Simulated Route and Details overlay */}
        {useSimulated && selectedMockPoint && (
          <div className="absolute bottom-20 left-4 right-4 z-20 max-w-sm mx-auto bg-[#070f24]/95 border border-cyan/25 rounded-2xl p-4 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-md animate-fadeSlideUp">
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
              <button 
                onClick={() => {
                  setSelectedMockPoint(null);
                  setSimulatedRouteActive(false);
                }} 
                className="text-white/30 hover:text-white/70"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-white/70 text-xs leading-relaxed mb-4">
              {selectedMockPoint.description}
            </p>

            {simulatedRouteActive ? (
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
            ) : null}

            <div className="flex gap-2">
              {!simulatedRouteActive ? (
                <button
                  onClick={() => handleSimulateRoute(selectedMockPoint)}
                  className="flex-1 py-2.5 bg-cyan text-black hover:bg-cyan/90 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-cyan/20"
                >
                  <Navigation size={12} className="fill-black" />
                  Draw Safest Route
                </button>
              ) : (
                <button
                  onClick={() => setSimulatedRouteActive(false)}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Cancel Route
                </button>
              )}
              
              <button
                onClick={startTracking}
                className={`px-3 py-2.5 rounded-xl font-bold text-xs border flex items-center gap-1.5 transition-colors ${
                  trackingSessionId 
                    ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <Activity size={12} />
                {trackingSessionId ? 'Live active' : 'Share live'}
              </button>
            </div>
          </div>
        )}

        {/* Google Maps Route Info Overlay */}
        {!useSimulated && directionsResponse && distance && duration && (
          <div className="absolute bottom-20 left-4 right-4 z-20 max-w-sm mx-auto bg-[#070f24]/95 border border-cyan/30 rounded-2xl p-4 shadow-xl backdrop-blur-md animate-fadeSlideUp">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-white/40 text-[10px] uppercase tracking-wider font-bold">Route Estimate</p>
                <h4 className="text-white text-sm font-semibold truncate mt-0.5">{destination?.name}</h4>
              </div>
              <div className="text-right">
                <span className="text-cyan font-bold text-sm block">{duration}</span>
                <span className="text-white/60 text-xs mt-0.5 block">{distance}</span>
              </div>
            </div>
          </div>
        )}

        {/* Global floating locator button */}
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2">
          <button 
            onClick={() => {
              if (useSimulated) {
                // simulated mode: center radar view
                setSelectedMockPoint(null);
                setSimulatedRouteActive(false);
              } else {
                map?.panTo(userLocation);
              }
            }}
            className="w-12 h-12 bg-[#070f24]/90 border border-white/10 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-md text-cyan hover:text-white transition-colors"
          >
            <Crosshair className="w-5 h-5" />
          </button>
          
          <button 
            onClick={trackingSessionId ? stopTracking : startTracking}
            className={`px-4 py-3 rounded-2xl font-bold shadow-2xl border flex items-center gap-2 backdrop-blur-md transition-all active:scale-95 ${
              trackingSessionId 
                ? 'bg-red-500/20 border-red-500 text-red-400' 
                : 'bg-cyan/15 border-cyan text-cyan'
            }`}
          >
            <Navigation className={`w-5 h-5 ${trackingSessionId ? 'animate-pulse' : ''}`} />
            {trackingSessionId ? 'Sharing live GPS' : 'Share Live Route'}
          </button>
        </div>

      </div>
      <BottomNav />
    </BackgroundGlow>
  );
}
