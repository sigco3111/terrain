
import React, { useState, useCallback, useMemo } from 'react';
import MapComponent from './components/MapComponent';
import DashboardPanel from './components/DashboardPanel';
import { getElevationProfile, getElevationProfileForPath } from './services/topoService';
import { LocationPoint, ElevationResult } from './types';
import { calculateProfileStats, calculateDistance } from './utils/stats';
import { MapLayerKey } from './config';

export interface HoverData {
  location: LocationPoint;
  distance: number;
  elevation: number;
}

type RouteMode = 'two-point' | 'multi-point';

const App: React.FC = () => {
  const [routeMode, setRouteMode] = useState<RouteMode>('two-point');
  const [mapLayer, setMapLayer] = useState<MapLayerKey>('dark');
  const [startPoint, setStartPoint] = useState<LocationPoint | null>(null);
  const [endPoint, setEndPoint] = useState<LocationPoint | null>(null);
  const [waypoints, setWaypoints] = useState<LocationPoint[]>([]);
  const [profileData, setProfileData] = useState<ElevationResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredData, setHoveredData] = useState<HoverData | null>(null);

  const pathPointsWithDistance = useMemo(() => {
    if (!profileData || profileData.length === 0) return [];
    let cumulativeDistance = 0;
    return profileData.map((point, index) => {
        if (index > 0) {
            cumulativeDistance += calculateDistance(profileData[index - 1].location, point.location);
        }
        return { ...point, distance: cumulativeDistance };
    });
  }, [profileData]);

  const fetchTwoPointProfile = useCallback(async (start: LocationPoint, end: LocationPoint) => {
    setIsLoading(true);
    setError(null);
    setHoveredData(null);
    try {
      const data = await getElevationProfile(start, end);
      if (data.length > 0) {
        setProfileData(data);
      } else {
        setError("이 경로에 대한 고도 데이터를 찾을 수 없습니다.");
        setProfileData([]);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("알 수 없는 오류가 발생했습니다.");
      }
      setProfileData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setStartPoint(null);
    setEndPoint(null);
    setWaypoints([]);
    setProfileData([]);
    setError(null);
    setIsLoading(false);
    setHoveredData(null);
  }, []);

  const handleModeChange = useCallback((mode: RouteMode) => {
    setRouteMode(mode);
    handleReset();
  }, [handleReset]);

  const handleLayerChange = useCallback((layer: MapLayerKey) => {
    setMapLayer(layer);
  }, []);
  
  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (routeMode === 'two-point') {
        if (!startPoint) {
          setStartPoint({ lat, lng });
          setEndPoint(null);
          setProfileData([]);
          setError(null);
          setHoveredData(null);
        } else if (!endPoint) {
          const newEndPoint = { lat, lng };
          setEndPoint(newEndPoint);
          fetchTwoPointProfile(startPoint, newEndPoint);
        }
    } else { // multi-point
        setWaypoints(prev => [...prev, { lat, lng }]);
        setProfileData([]);
        setError(null);
    }
  }, [routeMode, startPoint, endPoint, fetchTwoPointProfile]);
  
  const handleAnalyzePath = useCallback(async () => {
    if (waypoints.length < 2) return;
    setIsLoading(true);
    setError(null);
    setHoveredData(null);
    try {
      const data = await getElevationProfileForPath(waypoints);
      if (data.length > 0) {
        setProfileData(data);
      } else {
        setError("이 경로에 대한 고도 데이터를 찾을 수 없습니다.");
        setProfileData([]);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("알 수 없는 오류가 발생했습니다.");
      }
      setProfileData([]);
    } finally {
      setIsLoading(false);
    }
  }, [waypoints]);

  const profileStats = profileData.length > 0 ? calculateProfileStats(profileData) : null;

  const handleChartHover = useCallback((data: HoverData | null) => {
    setHoveredData(data);
  }, []);

  const handleMapHover = useCallback((location: LocationPoint | null) => {
    if (!location) {
        if(hoveredData) setHoveredData(null);
        return;
    }

    let closestPoint: (ElevationResult & { distance: number }) | null = null;
    let minSqlDistance = Infinity;

    for (const point of pathPointsWithDistance) {
        const sqlDist = Math.pow(location.lat - point.location.lat, 2) + Math.pow(location.lng - point.location.lng, 2);
        if (sqlDist < minSqlDistance) {
            minSqlDistance = sqlDist;
            closestPoint = point;
        }
    }
    
    if (closestPoint && hoveredData?.location !== closestPoint.location) {
        setHoveredData(closestPoint);
    }
  }, [pathPointsWithDistance, hoveredData]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-900 text-gray-200 font-sans">
      <DashboardPanel
        routeMode={routeMode}
        mapLayer={mapLayer}
        startPoint={startPoint}
        endPoint={endPoint}
        waypoints={waypoints}
        profileData={profileData}
        profileStats={profileStats}
        isLoading={isLoading}
        error={error}
        onReset={handleReset}
        onModeChange={handleModeChange}
        onLayerChange={handleLayerChange}
        onAnalyzePath={handleAnalyzePath}
        hoveredData={hoveredData}
        onChartHover={handleChartHover}
      />
      <main className="flex-1 h-full relative">
        <div className="absolute inset-0 w-full h-full">
          <MapComponent
            routeMode={routeMode}
            mapLayer={mapLayer}
            startPoint={startPoint}
            endPoint={endPoint}
            waypoints={waypoints}
            profileData={profileData}
            onMapClick={handleMapClick}
            hoveredData={hoveredData}
            onMapHover={handleMapHover}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
