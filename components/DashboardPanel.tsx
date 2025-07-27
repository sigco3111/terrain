
import React from 'react';
import { LocationPoint, ElevationResult, ProfileStats } from '../types';
import { HoverData } from '../App';
import ElevationChart from './ElevationChart';
import { InfoIcon, LoaderIcon, MapPinIcon, MountainIcon, TrendingUpIcon, WarningIcon, RefreshCwIcon, RouteIcon, TrendingDownIcon, WaypointsIcon } from './icons';
import { MapLayerKey } from '../config';

type RouteMode = 'two-point' | 'multi-point';

interface DashboardPanelProps {
    routeMode: RouteMode;
    mapLayer: MapLayerKey;
    startPoint: LocationPoint | null;
    endPoint: LocationPoint | null;
    waypoints: LocationPoint[];
    profileData: ElevationResult[];
    profileStats: ProfileStats | null;
    isLoading: boolean;
    error: string | null;
    onReset: () => void;
    onModeChange: (mode: RouteMode) => void;
    onLayerChange: (layer: MapLayerKey) => void;
    onAnalyzePath: () => void;
    hoveredData: HoverData | null;
    onChartHover: (data: HoverData | null) => void;
}

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string | React.ReactNode; }> = ({ icon, label, value }) => (
    <div className="bg-gray-700/50 rounded-lg p-3 flex items-center">
        <div className="mr-3 text-cyan-400">{icon}</div>
        <div>
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-md font-bold text-gray-100">{value}</p>
        </div>
    </div>
);

const InfoPanel: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
    <div className="flex flex-col items-center justify-center text-center text-gray-500 p-8 bg-gray-700/50 rounded-lg h-44">
        {icon}
        <p className="mt-2">{text}</p>
    </div>
);

const DashboardPanel: React.FC<DashboardPanelProps> = ({
  routeMode,
  mapLayer,
  startPoint,
  endPoint,
  waypoints,
  profileData,
  profileStats,
  isLoading,
  error,
  onReset,
  onModeChange,
  onLayerChange,
  onAnalyzePath,
  hoveredData,
  onChartHover,
}) => {
  const getInfoContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center text-gray-400 p-8 bg-gray-700/50 rounded-lg h-44">
          <LoaderIcon className="animate-spin w-6 h-6 mr-3" />
          프로필 데이터 가져오는 중...
        </div>
      );
    }
    if (error) {
      return (
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative h-44 flex items-center" role="alert">
            <WarningIcon className="w-6 h-6 mr-3 flex-shrink-0" />
            <div>
              <strong className="font-bold">오류:</strong>
              <span className="block sm:inline ml-1">{error}</span>
            </div>
        </div>
      );
    }
    if (profileStats) {
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <StatCard icon={<RouteIcon className="w-5 h-5"/>} label="거리" value={`${profileStats.distance.toFixed(2)} km`} />
          </div>
          <StatCard icon={<MountainIcon className="w-5 h-5"/>} label="최고 고도" value={`${profileStats.maxElevation.toFixed(0)} m`} />
          <StatCard icon={<MountainIcon className="w-5 h-5 -scale-y-100"/>} label="최저 고도" value={`${profileStats.minElevation.toFixed(0)} m`} />
          <StatCard icon={<TrendingUpIcon className="w-5 h-5"/>} label="상승고도 합계" value={`${profileStats.totalAscent.toFixed(0)} m`} />
          <StatCard icon={<TrendingDownIcon className="w-5 h-5"/>} label="하강고도 합계" value={`${profileStats.totalDescent.toFixed(0)} m`} />
        </div>
      );
    }
    
    if (routeMode === 'multi-point') {
        if (waypoints.length === 0) return <InfoPanel icon={<WaypointsIcon className="w-8 h-8"/>} text="지도 위를 클릭하여 경로를 그려나가세요." />;
        if (waypoints.length === 1) return <InfoPanel icon={<WaypointsIcon className="w-8 h-8"/>} text="경로를 만들려면 한 점 이상을 더 추가하세요." />;
        return (
            <div className="flex flex-col items-center justify-center text-center p-4 bg-gray-700/50 rounded-lg h-44">
                <p className="text-lg font-semibold">{waypoints.length}개의 경유지 선택됨</p>
                <p className="text-sm text-gray-400 mt-2">경유지를 계속 추가하거나, 분석을 시작하세요.</p>
                <button 
                    onClick={onAnalyzePath} 
                    className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-colors"
                >
                    경로 분석
                </button>
            </div>
        );
    }

    if (startPoint && !endPoint) {
      return <InfoPanel icon={<MapPinIcon className="w-8 h-8"/>} text="지도 위를 클릭하여 종료점을 설정하세요." />;
    }
    return <InfoPanel icon={<MapPinIcon className="w-8 h-8"/>} text="지도 위를 클릭하여 시작점을 설정하세요." />;
  };

  const LayerButton: React.FC<{layer: MapLayerKey, children: React.ReactNode}> = ({ layer, children }) => (
    <button 
        onClick={() => onLayerChange(layer)} 
        className={`py-2 rounded-md transition-colors text-center ${mapLayer === layer ? 'bg-cyan-600 text-white font-semibold shadow' : 'bg-gray-700/50 hover:bg-gray-600/50'}`}
    >
        {children}
    </button>
  );

  return (
    <aside className="w-96 h-full bg-gray-800/70 backdrop-blur-sm p-6 flex flex-col space-y-6 overflow-y-auto z-50 shadow-2xl border-r border-gray-700">
      <header className="flex justify-between items-start">
        <div>
            <h1 className="text-2xl font-bold text-white flex items-center">
                <RouteIcon className="w-8 h-8 mr-2 text-cyan-400" />
                지형 프로필 분석기
            </h1>
            <p className="text-sm text-gray-400 mt-1">지도 위 경로의 지형을 분석합니다.</p>
        </div>
        <button
            onClick={onReset}
            className="p-2 bg-gray-700/50 hover:bg-gray-600/80 rounded-full text-gray-300 hover:text-white transition-colors"
            aria-label="초기화"
            title="초기화"
        >
            <RefreshCwIcon className="w-5 h-5"/>
        </button>
      </header>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-gray-200 mb-3">경로 설정 방식</h2>
          <div className="flex bg-gray-700/50 rounded-lg p-1 text-sm">
              <button onClick={() => onModeChange('two-point')} className={`flex-1 py-1.5 rounded-md transition-colors ${routeMode === 'two-point' ? 'bg-cyan-600 text-white font-semibold shadow' : 'hover:bg-gray-600/50'}`}>두 지점</button>
              <button onClick={() => onModeChange('multi-point')} className={`flex-1 py-1.5 rounded-md transition-colors ${routeMode === 'multi-point' ? 'bg-cyan-600 text-white font-semibold shadow' : 'hover:bg-gray-600/50'}`}>다지점 경로</button>
          </div>
        </section>

        <section>
            <h2 className="text-lg font-semibold text-gray-200 mb-3">지도 스타일</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
                <LayerButton layer='dark'>다크</LayerButton>
                <LayerButton layer='street'>일반</LayerButton>
                <LayerButton layer='satellite'>위성</LayerButton>
                <LayerButton layer='terrain'>지형</LayerButton>
            </div>
        </section>
      </div>


      <div className="flex-grow flex flex-col">
        <h2 className="text-lg font-semibold text-gray-200 mb-3">프로필 요약</h2>
        {getInfoContent()}
      </div>

      <div className="flex-grow flex flex-col min-h-0">
        <h2 className="text-lg font-semibold text-gray-200 mb-3">고도 프로필 차트</h2>
        <div className="bg-gray-700/50 rounded-lg p-2 flex-grow">
          {profileData.length > 0 && !isLoading ? (
            <ElevationChart 
              data={profileData}
              hoveredData={hoveredData}
              onHover={onChartHover}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>분석 결과는 여기에 표시됩니다.</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default DashboardPanel;
