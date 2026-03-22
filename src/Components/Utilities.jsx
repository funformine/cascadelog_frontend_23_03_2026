export function LoadingSvg() {
    return (<>
      <div style={{ transform: 'scale(2)' }}>
  <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" stroke="#e11d48">
    <g fill="none" fillRule="evenodd" strokeWidth="2">
        <circle cx="25" cy="25" r="1">
            <animate attributeName="r" begin="0s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" begin="0s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite" />
        </circle>
        <circle cx="25" cy="25" r="1">
            <animate attributeName="r" begin="-0.9s" dur="1.8s" values="1; 20" calcMode="spline" keyTimes="0; 1" keySplines="0.165, 0.84, 0.44, 1" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" begin="-0.9s" dur="1.8s" values="1; 0" calcMode="spline" keyTimes="0; 1" keySplines="0.3, 0.61, 0.355, 1" repeatCount="indefinite" />
        </circle>
    </g>
            </svg>
            </div>
  </>)
}


export function LogoSVG() {
    return (
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
            <path d="M85 40 C70 40, 70 40, 70 55 L70 75 C70 85, 60 85, 60 90 C60 95, 70 95, 70 105 L70 125 C70 140, 70 140, 85 140" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M115 40 C130 40, 130 40, 130 55 L130 75 C130 85, 140 85, 140 90 C140 95, 130 95, 130 105 L130 125 C130 140, 130 140, 115 140" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
            <g stroke="#FFF0B3" strokeWidth="5" strokeLinecap="round">
                <line x1="85" y1="58" x2="115" y2="58" />
                <line x1="80" y1="74" x2="120" y2="74" />
                <line x1="80" y1="90" x2="120" y2="90" />
                <line x1="80" y1="106" x2="120" y2="106" />
                <line x1="85" y1="122" x2="115" y2="122" />
            </g>
        </svg>
    );
}