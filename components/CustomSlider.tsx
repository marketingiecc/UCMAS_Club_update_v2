import React, { useState, useRef, useEffect } from 'react';

interface CustomSliderProps {
  label?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  valueLabel?: string;
  color?: 'blue' | 'red' | 'green' | 'yellow';
  showMinMax?: boolean;
  minLabel?: string;
  maxLabel?: string;
  unit?: string;
}

function roundToStep(val: number, step: number): number {
  if (step <= 0) return val;
  const decimals = step < 1 ? 1 : 0;
  const rounded = Math.round(val / step) * step;
  return parseFloat(rounded.toFixed(decimals));
}

const CustomSlider: React.FC<CustomSliderProps> = ({
  label = '',
  value,
  min,
  max,
  step = 1,
  onChange,
  valueLabel,
  color = 'blue',
  showMinMax = true,
  minLabel,
  maxLabel,
  unit = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const safeValue = roundToStep(value, step);
  const percentage = ((safeValue - min) / (max - min)) * 100;
  const displayValue = valueLabel ?? (step < 1 ? `${safeValue.toFixed(1)}${unit}` : `${safeValue}${unit}`);

  const colorClasses = {
    blue: {
      track: 'bg-blue-200',
      fill: 'bg-ucmas-blue',
      thumb: 'border-ucmas-blue bg-white',
      badge: 'bg-ucmas-blue text-white',
      glow: 'shadow-blue-500/50'
    },
    red: {
      track: 'bg-red-200',
      fill: 'bg-ucmas-red',
      thumb: 'border-ucmas-red bg-white',
      badge: 'bg-ucmas-red text-white',
      glow: 'shadow-red-500/50'
    },
    green: {
      track: 'bg-green-200',
      fill: 'bg-green-500',
      thumb: 'border-green-500 bg-white',
      badge: 'bg-green-500 text-white',
      glow: 'shadow-green-500/50'
    },
    yellow: {
      track: 'bg-yellow-200',
      fill: 'bg-ucmas-yellow',
      thumb: 'border-ucmas-yellow bg-white',
      badge: 'bg-ucmas-yellow text-white',
      glow: 'shadow-yellow-500/50'
    }
  };

  const colors = colorClasses[color];

  const calculateValueFromPosition = React.useCallback((clientX: number) => {
    if (!sliderRef.current) return roundToStep(value, step);
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const raw = min + (pct / 100) * (max - min);
    const snapped = roundToStep(raw, step);
    return Math.max(min, Math.min(max, snapped));
  }, [min, max, step, value]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const newValue = calculateValueFromPosition(e.clientX);
    if (isDragging) {
      onChange(newValue);
    } else {
      setHoverValue(newValue);
    }
  };

  const handleMouseLeave = () => {
    if (!isDragging) {
      setHoverValue(null);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) {
      const newValue = calculateValueFromPosition(e.clientX);
      onChange(newValue);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (sliderRef.current) {
        const newValue = calculateValueFromPosition(e.clientX);
        onChange(newValue);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setHoverValue(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, calculateValueFromPosition, onChange]);

  return (
    <div className="space-y-4">
      {/* Label and Value Badge */}
      <div className="flex justify-between items-center px-1">
        {label ? (
          <label className="text-[11px] font-heading font-black text-gray-400 uppercase tracking-widest">
            {label}
          </label>
        ) : (
          <span />
        )}
        <div className={`${colors.badge} px-4 py-1.5 rounded-xl shadow-lg font-heading font-black text-sm transition-all duration-300 transform ${isDragging ? 'scale-110' : 'scale-100'} ${colors.glow} shadow-lg`}>
          {displayValue}
        </div>
      </div>

      {/* Slider Container */}
      <div 
        ref={sliderRef}
        className="relative h-6 cursor-pointer group"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {/* Track Background */}
        <div className={`absolute top-1/2 left-0 right-0 h-3 ${colors.track} rounded-full transform -translate-y-1/2 transition-all duration-200 group-hover:h-4`}></div>
        
        {/* Progress Fill */}
        <div 
          className={`absolute top-1/2 left-0 h-3 ${colors.fill} rounded-full transform -translate-y-1/2 transition-all duration-300 ease-out group-hover:h-4 ${colors.glow} shadow-md`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        ></div>

        {/* Thumb */}
        <div
          className={`absolute top-1/2 w-6 h-6 ${colors.thumb} border-4 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 cursor-grab active:cursor-grabbing ${isDragging ? 'scale-125 ring-4 ring-opacity-30' : 'scale-100 group-hover:scale-110'} ${colors.glow} shadow-xl z-10`}
          style={{ 
            left: `${Math.min(100, Math.max(0, percentage))}%`,
            transition: isDragging ? 'none' : 'all 0.2s ease-out'
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
        >
          {/* Inner dot for better visibility */}
          <div className={`absolute top-1/2 left-1/2 w-2 h-2 ${colors.fill} rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200 ${isDragging ? 'scale-150' : 'scale-100'}`}></div>
          
          {/* Ripple effect on drag */}
          {isDragging && (
            <div className={`absolute top-1/2 left-1/2 w-8 h-8 ${colors.fill} rounded-full transform -translate-x-1/2 -translate-y-1/2 opacity-20 animate-ping`}></div>
          )}
        </div>

        {/* Hover Tooltip */}
        {hoverValue !== null && hoverValue !== value && (
          <div 
            className={`absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full mb-2 ${colors.badge} px-3 py-1 rounded-lg text-xs font-heading font-black shadow-lg z-20 pointer-events-none transition-opacity duration-200`}
            style={{ left: `${((roundToStep(hoverValue, step) - min) / (max - min)) * 100}%` }}
          >
            {step < 1 ? roundToStep(hoverValue, step).toFixed(1) : hoverValue}{unit}
            <div 
              className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
              style={{ borderTopColor: color === 'blue' ? '#0066CC' : color === 'red' ? '#EC1C24' : color === 'green' ? '#48B700' : '#FFC107' }}
            ></div>
          </div>
        )}

        {/* Native Input (hidden but functional for accessibility) */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={safeValue}
          onChange={(e) => onChange(roundToStep(parseFloat(e.target.value), step))}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
          aria-label={label}
        />
      </div>

      {/* Min/Max Labels */}
      {showMinMax && (
        <div className="flex justify-between text-[10px] text-gray-400 font-heading font-bold px-1">
          <span className="transition-all duration-200 group-hover:text-gray-600">
            {minLabel || `${min}${unit}`}
          </span>
          <span className="transition-all duration-200 group-hover:text-gray-600">
            {maxLabel || `${max}${unit}`}
          </span>
        </div>
      )}
    </div>
  );
};

export default CustomSlider;
