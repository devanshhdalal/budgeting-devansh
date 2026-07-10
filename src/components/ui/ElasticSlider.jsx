import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'framer-motion';
import { useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import './ElasticSlider.css';

const MAX_OVERFLOW = 50;

const decay = (value, max) => {
  if (max === 0) return 0;
  const entry = value / max;
  const sigmoid = 2 * (1 / (1 + Math.exp(-entry)) - 0.5);
  return sigmoid * max;
};

const Slider = ({
  value: controlledValue,
  defaultValue,
  onChange,
  startingValue,
  maxValue,
  isStepped,
  stepSize,
  leftIcon,
  rightIcon,
  hideValueIndicator,
  formatValue,
  disabled,
  ariaLabel,
}) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue;

  const sliderRef = useRef(null);
  const [region, setRegion] = useState('middle');
  const clientX = useMotionValue(0);
  const overflow = useMotionValue(0);
  const scale = useMotionValue(1);

  useMotionValueEvent(clientX, 'change', (latest) => {
    if (!sliderRef.current) return;
    const { left, right } = sliderRef.current.getBoundingClientRect();
    let newValue;

    if (latest < left) {
      setRegion('left');
      newValue = left - latest;
    } else if (latest > right) {
      setRegion('right');
      newValue = latest - right;
    } else {
      setRegion('middle');
      newValue = 0;
    }

    overflow.jump(decay(newValue, MAX_OVERFLOW));
  });

  const commitValue = (next) => {
    const clamped = Math.min(Math.max(next, startingValue), maxValue);
    if (controlledValue === undefined) setUncontrolledValue(clamped);
    onChange?.(clamped);
  };

  const handlePointerMove = (e) => {
    if (disabled || e.buttons <= 0 || !sliderRef.current) return;

    const { left, width } = sliderRef.current.getBoundingClientRect();
    let next = startingValue + ((e.clientX - left) / width) * (maxValue - startingValue);

    if (isStepped) {
      next = Math.round(next / stepSize) * stepSize;
    }

    commitValue(next);
    clientX.jump(e.clientX);
  };

  const handlePointerDown = (e) => {
    if (disabled) return;
    handlePointerMove(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerUp = () => {
    animate(overflow, 0, { type: 'spring', bounce: 0.5 });
  };

  const getRangePercentage = () => {
    const totalRange = maxValue - startingValue;
    if (totalRange === 0) return 0;
    return ((value - startingValue) / totalRange) * 100;
  };

  const scaleX = useTransform(() => {
    if (!sliderRef.current) return 1;
    const { width } = sliderRef.current.getBoundingClientRect();
    return 1 + overflow.get() / width;
  });

  const scaleY = useTransform(overflow, [0, MAX_OVERFLOW], [1, 0.8]);

  const transformOrigin = useTransform(() => {
    if (!sliderRef.current) return 'center';
    const { left, width } = sliderRef.current.getBoundingClientRect();
    return clientX.get() < left + width / 2 ? 'right' : 'left';
  });

  const trackHeight = useTransform(scale, [1, 1.2], [6, 10]);
  const trackMargin = useTransform(scale, [1, 1.2], [0, -2]);

  const leftX = useTransform(() => (region === 'left' ? -overflow.get() / scale.get() : 0));
  const rightX = useTransform(() => (region === 'right' ? overflow.get() / scale.get() : 0));
  const thumbOpacity = useTransform(scale, [1, 1.2], [0.75, 1]);

  const displayValue = formatValue ? formatValue(value) : Math.round(value);

  return (
    <div className="elastic-slider-inner">
      <motion.div
        className={`elastic-slider-wrapper ${disabled ? 'elastic-slider-disabled' : ''}`}
        onHoverStart={() => !disabled && animate(scale, 1.15)}
        onHoverEnd={() => animate(scale, 1)}
        onTouchStart={() => !disabled && animate(scale, 1.15)}
        onTouchEnd={() => animate(scale, 1)}
        style={{ scale, opacity: thumbOpacity }}
      >
        <motion.div
          animate={{
            scale: region === 'left' ? [1, 1.35, 1] : 1,
            transition: { duration: 0.25 },
          }}
          style={{ x: leftX }}
          className="elastic-slider-icon-wrap"
          aria-hidden
        >
          {leftIcon}
        </motion.div>

        <div
          ref={sliderRef}
          className="elastic-slider-root"
          role="slider"
          aria-label={ariaLabel}
          aria-valuemin={startingValue}
          aria-valuemax={maxValue}
          aria-valuenow={value}
          aria-disabled={disabled || undefined}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onLostPointerCapture={handlePointerUp}
        >
          <motion.div
            className="elastic-slider-track-wrapper"
            style={{
              scaleX,
              scaleY,
              transformOrigin,
              height: trackHeight,
              marginTop: trackMargin,
              marginBottom: trackMargin,
            }}
          >
            <div className="elastic-slider-track">
              <div className="elastic-slider-range" style={{ width: `${getRangePercentage()}%` }} />
            </div>
          </motion.div>
        </div>

        <motion.div
          animate={{
            scale: region === 'right' ? [1, 1.35, 1] : 1,
            transition: { duration: 0.25 },
          }}
          style={{ x: rightX }}
          className="elastic-slider-icon-wrap"
          aria-hidden
        >
          {rightIcon}
        </motion.div>
      </motion.div>

      {!hideValueIndicator && (
        <p className="elastic-slider-value" aria-live="polite">
          {displayValue}
        </p>
      )}
    </div>
  );
};

const ElasticSlider = ({
  value,
  defaultValue = 50,
  onChange,
  startingValue = 0,
  maxValue = 100,
  className = '',
  isStepped = false,
  stepSize = 1,
  leftIcon = <Minus size={18} className="elastic-slider-icon" />,
  rightIcon = <Plus size={18} className="elastic-slider-icon" />,
  hideValueIndicator = false,
  formatValue,
  fullWidth = false,
  disabled = false,
  ariaLabel,
}) => (
  <div
    className={`elastic-slider ${fullWidth ? 'elastic-slider--full' : ''} ${className}`.trim()}
  >
    <Slider
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      startingValue={startingValue}
      maxValue={maxValue}
      isStepped={isStepped}
      stepSize={stepSize}
      leftIcon={leftIcon}
      rightIcon={rightIcon}
      hideValueIndicator={hideValueIndicator}
      formatValue={formatValue}
      disabled={disabled}
      ariaLabel={ariaLabel}
    />
  </div>
);

export default ElasticSlider;
