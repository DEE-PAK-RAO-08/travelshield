import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  Search, Crosshair, Navigation, X, Layers, MapPin, ChevronRight,
  Shield, Users, AlertTriangle, ChevronDown, ChevronUp, Clock, Route
} from 'lucide-react';
import { BackgroundGlow } from '@/components/ui/BackgroundGlow';
import { BottomNav } from '@/components/layout/BottomNav';
import { dashboardApi } from '@/api/client';
import { getSocket } from '@/api/socket';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer, Circle } from '@react-google-maps/api';

const libraries: ("places" | "geometry")[] = ['places', 'geometry'];
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = { lat: 28.6139, lng: 77.2090 };

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

  // Initialize Map Services
  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    placesService.current = new window.google.maps.places.PlacesService(mapInstance);
    autocompleteService.current = new window.google.maps.places.AutocompleteService();
  }, []);

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

  // Search places when category changes
  useEffect(() => {
    if (!isLoaded || !map || !placesService.current || !activeCategory) return;
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
  }, [isLoaded, map, activeCategory, userLocation]);

  // Calculate Route
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
    if (destination) calculateRoute();
    else setDirectionsResponse(null);
  }, [destination]);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
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
      const res = await dashboardApi.triggerSos({ type: 'LIVE_TRACK' }); // Create a tracking session implicitly
      // We added /api/tracking/start in Phase 1, we can call that!
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
      console.error(err);
    }
  };

  if (loadError) return <div className="text-white p-4">Error loading maps. Check API Key.</div>;
  if (!isLoaded) return <div className="text-white p-4">Loading Maps...</div>;

  return (
    <BackgroundGlow>
      <div className="relative w-full" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
        
        {!GOOGLE_MAPS_API_KEY && (
          <div className="absolute top-20 left-4 right-4 z-50 bg-red-500/90 text-white p-3 rounded-xl border border-red-400 text-sm">
            <b>Missing API Key:</b> Please add VITE_GOOGLE_MAPS_API_KEY to your environment to enable full map functionality.
          </div>
        )}

        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={14}
          center={userLocation}
          options={{
            styles: [{ elementType: "geometry", stylers: [{ color: "#242f3e" }] }, { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] }, { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] }],
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

        {/* Search Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 p-3">
          <div className="relative max-w-2xl mx-auto">
            <div className="flex gap-2 items-center bg-[#0d1b3e]/95 border border-white/10 rounded-2xl px-4 h-12">
              <Search className="w-4 h-4 text-cyan" />
              <input
                value={searchQuery}
                onChange={handleSearchInput}
                placeholder="Search Google Maps..."
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/40"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setAutocompleteResults([]); setDestination(null); }}>
                  <X className="w-4 h-4 text-white/50" />
                </button>
              )}
            </div>

            {autocompleteResults.length > 0 && (
              <div className="absolute top-14 left-0 right-0 bg-[#0d1b3e]/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
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

            {/* Categories */}
            <div className="flex gap-2 mt-2 overflow-x-auto pb-2 scrollbar-none">
              {['police', 'hospital', 'fire_station', 'transit_station'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize border ${activeCategory === cat ? 'bg-cyan/20 border-cyan text-white' : 'bg-[#0d1b3e]/90 border-white/10 text-white/50'}`}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tracking Controls */}
        <div className="absolute bottom-4 right-4 z-20">
          <button 
            onClick={() => map?.panTo(userLocation)}
            className="w-12 h-12 bg-[#0d1b3e]/90 border border-white/10 rounded-full flex items-center justify-center mb-3 shadow-lg"
          >
            <Crosshair className="w-5 h-5 text-cyan" />
          </button>
          
          <button 
            onClick={startTracking}
            className={`px-4 py-3 rounded-2xl font-bold shadow-lg flex items-center gap-2 ${trackingSessionId ? 'bg-red-500/20 border border-red-500 text-red-500' : 'bg-cyan/20 border border-cyan text-cyan'}`}
          >
            <Navigation className="w-5 h-5" />
            {trackingSessionId ? 'Live Sharing Active' : 'Share Live Route'}
          </button>
        </div>

      </div>
      <BottomNav />
    </BackgroundGlow>
  );
}
