
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { LocationPoint, ElevationResult } from '../types';
import type { HoverData } from '../App';
import { calculateDistance } from '../utils/stats';
import { MAP_LAYERS, MapLayerKey } from '../config';

// Fix for default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const startIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const endIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const getGradientColor = (gradient: number): string => {
    if (gradient > 10) return '#d73027'; // 가파른 오르막 (진한 빨강)
    if (gradient > 5) return '#fc8d59';  // 오르막 (주황)
    if (gradient > 1) return '#fee08b';  // 완만한 오르막 (노랑)
    if (gradient > -1) return '#91cf60'; // 평지 (녹색)
    if (gradient > -5) return '#91bfdb'; // 완만한 내리막 (하늘색)
    if (gradient > -10) return '#4575b4';// 내리막 (파랑)
    return '#313695'; // 가파른 내리막 (남색)
};

const GradientPath: React.FC<{ data: ElevationResult[]; onHover: (location: LocationPoint | null) => void }> = ({ data, onHover }) => {
    if (data.length < 2) {
        return null;
    }

    const segments = [];
    for (let i = 1; i < data.length; i++) {
        const start = data[i - 1];
        const end = data[i];

        const distance = calculateDistance(start.location, end.location);
        const elevationChange = end.elevation - start.elevation;
        
        const gradient = distance > 0 ? (elevationChange / (distance * 1000)) * 100 : 0;
        
        segments.push({
            positions: [
                [start.location.lat, start.location.lng],
                [end.location.lat, end.location.lng],
            ],
            color: getGradientColor(gradient),
        });
    }

    const pathPositions = data.map(p => [p.location.lat, p.location.lng]);

    return (
        <>
            {segments.map((segment, index) => (
                <Polyline
                    key={index}
                    positions={segment.positions as L.LatLngExpression[]}
                    color={segment.color}
                    weight={5}
                    opacity={0.85}
                />
            ))}
            {/* Invisible wide polyline for hover detection */}
            <Polyline
                positions={pathPositions as L.LatLngExpression[]}
                color="transparent"
                weight={20}
                eventHandlers={{
                    mousemove: (e) => onHover(e.latlng),
                    mouseout: () => onHover(null),
                }}
            />
        </>
    );
};

const Legend: React.FC<{ mapLayer: MapLayerKey }> = ({ mapLayer }) => {
    const map = useMap();

    useEffect(() => {
        const legend = new L.Control({ position: 'bottomright' });

        legend.onAdd = () => {
            const isDark = mapLayer === 'dark';
            const bgColor = isDark ? 'bg-gray-800 bg-opacity-80' : 'bg-white bg-opacity-80';
            const textColor = isDark ? 'text-white' : 'text-gray-800';
            const div = L.DomUtil.create('div', `info legend ${bgColor} p-3 rounded-md shadow-lg ${textColor} text-xs w-36`);
            const labels = ['가파른 오르막 (>10%)', '오르막 (5-10%)', '완만한 오르막 (1-5%)', '평지 (~1%)', '완만한 내리막 (-1- -5%)', '내리막 (-5- -10%)', '가파른 내리막 (<-10%)'];
            const colors = ['#d73027', '#fc8d59', '#fee08b', '#91cf60', '#91bfdb', '#4575b4', '#313695'];
            
            div.innerHTML += `<h4 class="font-bold mb-2 text-sm">경사도</h4>`;
            
            for (let i = 0; i < colors.length; i++) {
                div.innerHTML +=
                    '<div class="flex items-center mb-1">' +
                    `<i class="w-4 h-4 mr-2 rounded-sm" style="background:${colors[i]}"></i> ` +
                    `<span>${labels[i]}</span>` +
                    '</div>';
            }
            return div;
        };

        legend.addTo(map);

        return () => {
            legend.remove();
        };
    }, [map, mapLayer]);

    return null;
};

const MapClickHandler: React.FC<{ onMapClick: (lat: number, lng: number) => void; }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const MapUpdater: React.FC<{ startPoint: LocationPoint | null; endPoint: LocationPoint | null; waypoints: LocationPoint[] }> = ({ startPoint, endPoint, waypoints }) => {
  const map = useMap();
  useEffect(() => {
    if (waypoints.length > 0) {
      const bounds = L.latLngBounds(waypoints.map(p => [p.lat, p.lng]));
      if(bounds.isValid()) {
        map.flyToBounds(bounds, { padding: [50, 50] });
      }
    } else if (startPoint && endPoint) {
      const bounds = L.latLngBounds([startPoint.lat, startPoint.lng], [endPoint.lat, endPoint.lng]);
      map.flyToBounds(bounds, { padding: [50, 50] });
    } else if (startPoint) {
      map.flyTo([startPoint.lat, startPoint.lng], map.getZoom());
    }
  }, [startPoint, endPoint, waypoints, map]);
  return null;
};

interface MapComponentProps {
  routeMode: 'two-point' | 'multi-point';
  mapLayer: MapLayerKey;
  startPoint: LocationPoint | null;
  endPoint: LocationPoint | null;
  waypoints: LocationPoint[];
  profileData: ElevationResult[];
  onMapClick: (lat: number, lng: number) => void;
  hoveredData: HoverData | null;
  onMapHover: (location: LocationPoint | null) => void;
}

const MapComponent: React.FC<MapComponentProps> = ({ routeMode, mapLayer, startPoint, endPoint, waypoints, profileData, onMapClick, hoveredData, onMapHover }) => {
  const mapRef = useRef<L.Map>(null);
  const hasProfile = profileData && profileData.length > 0;
  const isMultiPointMode = routeMode === 'multi-point';
  const selectedLayer = MAP_LAYERS[mapLayer];

  const waypointColor = (index: number) => {
    if (index === 0) return '#4ade80'; // green
    if (index === waypoints.length - 1) return '#f87171'; // red
    return '#38bdf8'; // blue
  };

  return (
    <MapContainer center={[20, 0]} zoom={3} scrollWheelZoom={true} ref={mapRef} className="z-0 w-full h-full">
      <TileLayer
        key={mapLayer}
        attribution={selectedLayer.attribution}
        url={selectedLayer.url}
      />
      <MapClickHandler onMapClick={onMapClick} />
      
      {isMultiPointMode ? (
        <>
          {waypoints.length > 1 && (
            <Polyline positions={waypoints.map(p => [p.lat, p.lng])} color="#38BDF8" dashArray="5, 10" weight={3} />
          )}
          {waypoints.map((point, index) => (
            <CircleMarker
              key={index}
              center={[point.lat, point.lng]}
              radius={6}
              color={waypointColor(index)}
              fillColor={waypointColor(index)}
              fillOpacity={0.8}
            >
              <Tooltip>경유지 {index + 1}</Tooltip>
            </CircleMarker>
          ))}
        </>
      ) : (
        <>
          {startPoint && (
            <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon}>
              <Popup>시작점</Popup>
            </Marker>
          )}
          {endPoint && (
            <Marker position={[endPoint.lat, endPoint.lng]} icon={endIcon}>
              <Popup>종료점</Popup>
            </Marker>
          )}
        </>
      )}

      {hasProfile ? (
        <GradientPath data={profileData} onHover={onMapHover} />
      ) : (
        !isMultiPointMode && startPoint && endPoint && (
          <Polyline positions={[[startPoint.lat, startPoint.lng], [endPoint.lat, endPoint.lng]]} color="#38BDF8" dashArray="5, 10" weight={3} />
        )
      )}
      <MapUpdater startPoint={startPoint} endPoint={endPoint} waypoints={waypoints} />
      {hasProfile && <Legend mapLayer={mapLayer} />}
      
      {hoveredData && (
        <CircleMarker
            center={[hoveredData.location.lat, hoveredData.location.lng]}
            radius={8}
            color="#FBBF24"
            fillColor="#FBBF24"
            fillOpacity={0.7}
            weight={2}
        >
            <Tooltip
                direction="top"
                offset={[0, -10]}
                opacity={1}
                permanent
                className="hover-tooltip"
            >
                {`${hoveredData.elevation.toFixed(0)}m`}
            </Tooltip>
        </CircleMarker>
      )}
       <style>{`
            .hover-tooltip {
                background-color: ${mapLayer === 'dark' ? '#1f2937' : 'white'};
                border: 1px solid #FBBF24;
                color: ${mapLayer === 'dark' ? '#f3f4f6' : '#1f2937'};
                padding: 4px 8px;
                border-radius: 4px;
                font-weight: bold;
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
                font-family: sans-serif;
            }
        `}</style>
    </MapContainer>
  );
};

export default MapComponent;
