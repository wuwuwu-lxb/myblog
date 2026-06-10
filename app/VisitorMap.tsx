import type { VisitorLocation } from "@/lib/db";
import { worldMapPaths } from "./worldMapPaths";

type VisitorMapProps = {
  locations: VisitorLocation[];
};

const mapWidth = 740;
const mapHeight = 444;
const minLatitude = -58;
const maxLatitude = 84;

const longitudeLines = [-120, -60, 0, 60, 120];
const latitudeLines = [-40, 0, 40, 80];

export function VisitorMap({ locations }: VisitorMapProps) {
  return (
    <div className="visitor-map" aria-label="访客地理分布">
      <svg viewBox={`0 0 ${mapWidth} ${mapHeight}`} role="img" aria-label="世界访客地图">
        <defs>
          <linearGradient id="visitorMapOcean" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(203 54% 75%)" />
            <stop offset="54%" stopColor="hsl(207 38% 61%)" />
            <stop offset="100%" stopColor="hsl(215 27% 36%)" />
          </linearGradient>
          <radialGradient id="visitorMapAtmosphere" cx="50%" cy="46%" r="78%">
            <stop offset="0%" stopColor="white" stopOpacity="0.13" />
            <stop offset="62%" stopColor="white" stopOpacity="0.025" />
            <stop offset="100%" stopColor="black" stopOpacity="0.28" />
          </radialGradient>
          <filter id="visitorMapPointShadow" x="-80%" y="-80%" width="260%" height="260%">
            <feDropShadow dx="0" dy="7" floodColor="black" floodOpacity="0.28" stdDeviation="6" />
          </filter>
        </defs>

        <rect className="visitor-map-ocean" x="0" y="0" width={mapWidth} height={mapHeight} rx="18" />
        <g className="visitor-map-graticule" aria-hidden="true">
          {longitudeLines.map((longitude) => {
            const x = project(0, longitude).x;
            return <path d={`M${x.toFixed(1)} 22 V422`} key={`longitude-${longitude}`} />;
          })}
          {latitudeLines.map((latitude) => {
            const y = project(latitude, 0).y;
            return <path d={`M26 ${y.toFixed(1)} H714`} key={`latitude-${latitude}`} />;
          })}
        </g>

        <g className="visitor-map-land" aria-hidden="true">
          {worldMapPaths.map((path, index) => (
            <path d={path} key={index} />
          ))}
        </g>

        <rect className="visitor-map-atmosphere" x="0" y="0" width={mapWidth} height={mapHeight} rx="18" />

        <g className="visitor-map-points">
          {locations.map((location) => {
            const point = project(location.latitude, location.longitude);
            const radius = Math.min(3.5, 1.5 + Math.sqrt(location.count) * 0.725);
            const city = location.city || location.region || location.country || "未知城市";
            const region = [location.region, location.country].filter(Boolean).join(" / ") || "未知来源";
            const label = `${city} · ${location.count} 个 IP`;
            const tooltip = getTooltipPosition(point.x, point.y);

            return (
              <g className="visitor-map-marker" key={`${city}-${location.latitude}-${location.longitude}`}>
                <circle className="visitor-map-point-halo" cx={point.x} cy={point.y} r={radius + 5.5} />
                <circle className="visitor-map-point-ring" cx={point.x} cy={point.y} r={radius + 2} />
                <circle className="visitor-map-point" cx={point.x} cy={point.y} filter="url(#visitorMapPointShadow)" r={radius} />
                <g className="visitor-map-tooltip" transform={`translate(${tooltip.x} ${tooltip.y})`}>
                  <rect width="184" height="62" rx="10" />
                  <text x="12" y="24">{city}</text>
                  <text x="12" y="44">
                    {region} · {location.count} 个 IP
                  </text>
                </g>
                <title>{`${label}，最近访问 ${formatDate(location.lastSeenAt)}`}</title>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function project(latitude: number, longitude: number) {
  const clampedLatitude = Math.min(maxLatitude, Math.max(minLatitude, latitude));
  const clampedLongitude = Math.min(180, Math.max(-180, longitude));

  return {
    x: ((clampedLongitude + 180) / 360) * mapWidth,
    y: ((maxLatitude - clampedLatitude) / (maxLatitude - minLatitude)) * mapHeight,
  };
}

function getTooltipPosition(x: number, y: number) {
  return {
    x: Math.min(Math.max(x + 14, 12), mapWidth - 196),
    y: Math.min(Math.max(y - 72, 12), mapHeight - 76),
  };
}

function formatDate(value: string) {
  return value.slice(0, 16).replace("T", " ");
}
