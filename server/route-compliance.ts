interface Coordinate {
  lat: number;
  lng: number;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function haversineDistance(coord1: Coordinate, coord2: Coordinate): number {
  const R = 6371e3;
  const lat1 = toRadians(coord1.lat);
  const lat2 = toRadians(coord2.lat);
  const deltaLat = toRadians(coord2.lat - coord1.lat);
  const deltaLng = toRadians(coord2.lng - coord1.lng);

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function interpolateRoute(start: Coordinate, end: Coordinate, numPoints: number = 10): Coordinate[] {
  const points: Coordinate[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    points.push({
      lat: start.lat + t * (end.lat - start.lat),
      lng: start.lng + t * (end.lng - start.lng),
    });
  }
  return points;
}

function pointToLineSegmentDistance(point: Coordinate, lineStart: Coordinate, lineEnd: Coordinate): number {
  const lineLat = lineEnd.lat - lineStart.lat;
  const lineLng = lineEnd.lng - lineStart.lng;
  const lineLength = Math.sqrt(lineLat * lineLat + lineLng * lineLng);
  
  if (lineLength === 0) {
    return haversineDistance(point, lineStart);
  }

  const t = Math.max(0, Math.min(1, 
    ((point.lat - lineStart.lat) * lineLat + (point.lng - lineStart.lng) * lineLng) / (lineLength * lineLength)
  ));

  const projection: Coordinate = {
    lat: lineStart.lat + t * lineLat,
    lng: lineStart.lng + t * lineLng,
  };

  return haversineDistance(point, projection);
}

export function calculateRouteCompliance(
  actualPath: Coordinate[],
  expectedStart: Coordinate,
  expectedEnd: Coordinate,
  toleranceMeters: number = 500
): { compliancePercent: number; maxDeviation: number; averageDeviation: number } {
  if (actualPath.length === 0) {
    return { compliancePercent: 100, maxDeviation: 0, averageDeviation: 0 };
  }

  const expectedRoute = interpolateRoute(expectedStart, expectedEnd, 20);
  
  let compliantPoints = 0;
  let totalDeviation = 0;
  let maxDeviation = 0;

  for (const actualPoint of actualPath) {
    let minDistance = Infinity;
    
    for (let i = 0; i < expectedRoute.length - 1; i++) {
      const distance = pointToLineSegmentDistance(actualPoint, expectedRoute[i], expectedRoute[i + 1]);
      minDistance = Math.min(minDistance, distance);
    }
    
    totalDeviation += minDistance;
    maxDeviation = Math.max(maxDeviation, minDistance);
    
    if (minDistance <= toleranceMeters) {
      compliantPoints++;
    }
  }

  const compliancePercent = (compliantPoints / actualPath.length) * 100;
  const averageDeviation = totalDeviation / actualPath.length;

  return {
    compliancePercent: Math.round(compliancePercent * 10) / 10,
    maxDeviation: Math.round(maxDeviation),
    averageDeviation: Math.round(averageDeviation),
  };
}

export function calculateTotalDistance(path: Coordinate[]): number {
  if (path.length < 2) return 0;
  
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += haversineDistance(path[i - 1], path[i]);
  }
  
  return Math.round(total);
}
