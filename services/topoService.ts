
import { API_BASE_URL } from '../constants';
import { ElevationResult, LocationPoint } from '../types';
import { calculateDistance } from '../utils/stats';

const getElevationApi = async (locations: { latitude: number; longitude: number }[]): Promise<any> => {
    const url = API_BASE_URL;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ locations }),
        });
        
        if (!response.ok) {
            let errorMessage = `API 요청 실패. 상태 코드: ${response.status}`;
            try {
                const errorBody = await response.json();
                if (errorBody && errorBody.error) {
                    errorMessage = `API 오류: ${errorBody.error}`;
                }
            } catch (e) {
                // Body not JSON or empty
            }
            throw new Error(errorMessage);
        }
        return response.json();

    } catch (error) {
        console.error("고도 데이터 가져오기 오류:", error);
        if (error instanceof Error) {
            if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
                if (!navigator.onLine) {
                    throw new Error('오프라인 상태입니다. 인터넷 연결을 확인해주세요.');
                }
                throw new Error('네트워크 오류: 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
            }
            throw error;
        }
        throw new Error('알 수 없는 오류가 발생했습니다.');
    }
};

export const getElevationProfile = async (start: LocationPoint, end: LocationPoint, samples: number = 100): Promise<ElevationResult[]> => {
    const locationsToFetch = [];
    for (let i = 0; i < samples; i++) {
        const t = i / (samples - 1);
        const lat = start.lat + t * (end.lat - start.lat);
        const lng = start.lng + t * (end.lng - start.lng);
        locationsToFetch.push({ latitude: lat, longitude: lng });
    }

    const data = await getElevationApi(locationsToFetch);
    
    return data.results.map((result: any) => ({
        elevation: result.elevation,
        location: {
            lat: result.latitude,
            lng: result.longitude,
        },
    }));
};

export const getElevationProfileForPath = async (path: LocationPoint[], totalSamples: number = 250): Promise<ElevationResult[]> => {
    if (path.length < 2) return [];

    const segmentDistances: number[] = [];
    let totalPathDistance = 0;

    for (let i = 0; i < path.length - 1; i++) {
        const dist = calculateDistance(path[i], path[i + 1]);
        segmentDistances.push(dist);
        totalPathDistance += dist;
    }

    if (totalPathDistance === 0) {
        const singlePointData = await getElevationApi([{ latitude: path[0].lat, longitude: path[0].lng }]);
        return singlePointData.results.map((result: any) => ({
            elevation: result.elevation,
            location: {
                lat: result.latitude,
                lng: result.longitude,
            },
        }));
    }
    
    const locationsToFetch: { latitude: number, longitude: number }[] = [];
    let cumulativeDistance = 0;
    const pathWithDistances = [{point: path[0], dist: 0}];
    for(let i=0; i< path.length - 1; i++) {
        cumulativeDistance += segmentDistances[i];
        pathWithDistances.push({point: path[i+1], dist: cumulativeDistance});
    }

    const step = totalPathDistance / (totalSamples - 1);
    for(let i = 0; i < totalSamples; i++) {
        const dist = i * step;
        
        let currentSegmentIndex = 0;
        for(let j = 0; j < pathWithDistances.length - 1; j++) {
            if(dist >= pathWithDistances[j].dist && dist <= pathWithDistances[j+1].dist) {
                currentSegmentIndex = j;
                break;
            }
        }
        
        const segmentStart = pathWithDistances[currentSegmentIndex];
        const segmentEnd = pathWithDistances[currentSegmentIndex + 1];
        
        const distanceIntoSegment = dist - segmentStart.dist;
        const segmentLength = segmentEnd.dist - segmentStart.dist;
        
        const t = segmentLength === 0 ? 0 : distanceIntoSegment / segmentLength;
        
        const lat = segmentStart.point.lat + t * (segmentEnd.point.lat - segmentStart.point.lat);
        const lng = segmentStart.point.lng + t * (segmentEnd.point.lng - segmentStart.point.lng);

        locationsToFetch.push({ latitude: lat, longitude: lng });
    }

    const data = await getElevationApi(locationsToFetch);
    
    return data.results.map((result: any) => ({
        elevation: result.elevation,
        location: {
            lat: result.latitude,
            lng: result.longitude,
        },
    }));
};
