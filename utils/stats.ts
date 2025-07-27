
import { ElevationResult, LocationPoint, ProfileStats } from '../types';

/**
 * Calculates the distance between two lat/lng points in kilometers using the Haversine formula.
 */
export function calculateDistance(point1: LocationPoint, point2: LocationPoint): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (point2.lat - point1.lat) * (Math.PI / 180);
  const dLon = (point2.lng - point1.lng) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point1.lat * (Math.PI / 180)) *
      Math.cos(point2.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Calculates statistics for an elevation profile.
 */
export function calculateProfileStats(profileData: ElevationResult[]): ProfileStats {
  if (profileData.length < 2) {
    return {
      distance: 0,
      maxElevation: profileData[0]?.elevation || 0,
      minElevation: profileData[0]?.elevation || 0,
      totalAscent: 0,
      totalDescent: 0,
    };
  }

  let distance = 0;
  let maxElevation = -Infinity;
  let minElevation = Infinity;
  let totalAscent = 0;
  let totalDescent = 0;

  for (let i = 0; i < profileData.length; i++) {
    const currentPoint = profileData[i];

    // Min/Max Elevation
    if (currentPoint.elevation > maxElevation) {
      maxElevation = currentPoint.elevation;
    }
    if (currentPoint.elevation < minElevation) {
      minElevation = currentPoint.elevation;
    }

    if (i > 0) {
      const prevPoint = profileData[i - 1];
      // Distance
      distance += calculateDistance(prevPoint.location, currentPoint.location);

      // Ascent/Descent
      const elevationChange = currentPoint.elevation - prevPoint.elevation;
      if (elevationChange > 0) {
        totalAscent += elevationChange;
      } else {
        totalDescent += Math.abs(elevationChange);
      }
    }
  }

  return { distance, maxElevation, minElevation, totalAscent, totalDescent };
}
