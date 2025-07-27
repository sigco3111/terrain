
export interface LocationPoint {
  lat: number;
  lng: number;
}

export interface ElevationResult {
  elevation: number;
  location: LocationPoint;
}

export interface LocationData extends ElevationResult {
  id: number;
}

export interface TopoAPIResponse {
  results: ElevationResult[];
}

export interface ProfileStats {
    distance: number;
    maxElevation: number;
    minElevation: number;
    totalAscent: number;
    totalDescent: number;
}
