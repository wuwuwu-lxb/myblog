import type { VisitorLocation } from "@/lib/db";

type VisitorMapProps = {
  locations: VisitorLocation[];
};

export function VisitorMap({ locations }: VisitorMapProps) {
  return (
    <div className="visitor-map" aria-label="访客地理分布">
      <svg viewBox="0 0 1000 500" role="img" aria-label="世界地图">
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="50%" r="70%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect className="visitor-map-ocean" x="0" y="0" width="1000" height="500" rx="24" />
        <g className="visitor-map-grid">
          {[125, 250, 375, 500, 625, 750, 875].map((x) => (
            <line key={`x-${x}`} x1={x} x2={x} y1="28" y2="472" />
          ))}
          {[100, 200, 300, 400].map((y) => (
            <line key={`y-${y}`} x1="32" x2="968" y1={y} y2={y} />
          ))}
        </g>
        <g className="visitor-map-land">
          <path d="M145 125 190 95 252 91 313 112 339 153 318 197 276 221 244 257 206 244 184 203 136 191 108 156Z" />
          <path d="M232 270 279 259 318 292 329 344 304 402 272 452 238 428 226 376 204 336Z" />
          <path d="M441 93 526 68 630 73 710 104 775 145 802 204 760 242 688 231 638 255 570 228 510 244 456 209 391 209 359 165Z" />
          <path d="M486 238 540 250 584 311 579 382 543 436 499 399 472 326Z" />
          <path d="M702 262 758 253 831 297 855 357 821 388 747 362 698 320Z" />
          <path d="M474 55 520 34 590 43 560 69 493 76Z" />
          <path d="M314 57 354 42 394 54 375 77 328 77Z" />
        </g>
        <g className="visitor-map-labels">
          <text x="655" y="185">中国</text>
          <text x="590" y="143">亚洲</text>
          <text x="205" y="172">北美</text>
          <text x="270" y="338">南美</text>
          <text x="508" y="173">欧洲</text>
          <text x="535" y="329">非洲</text>
          <text x="773" y="335">大洋洲</text>
        </g>
        <g className="visitor-map-points">
          {locations.map((location) => {
            const point = project(location.latitude, location.longitude);
            const radius = Math.min(16, 5 + location.count * 2);

            return (
              <g key={`${location.latitude}-${location.longitude}`}>
                <circle className="visitor-map-point-halo" cx={point.x} cy={point.y} r={radius + 8} />
                <circle className="visitor-map-point" cx={point.x} cy={point.y} r={radius} />
                <title>{`${location.city || location.region || location.country}：${location.count} 次`}</title>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}

function project(latitude: number, longitude: number) {
  return {
    x: ((longitude + 180) / 360) * 1000,
    y: ((90 - latitude) / 180) * 500,
  };
}
