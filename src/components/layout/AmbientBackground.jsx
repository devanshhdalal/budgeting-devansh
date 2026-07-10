import { useEffect, useMemo, useState } from 'react';
import Particles from './Particles';

const getParticleCount = () => {
  if (typeof window === 'undefined') return 480;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 0;
  return window.matchMedia('(max-width: 768px)').matches ? 280 : 520;
};

const AmbientBackground = ({ theme = 'dark' }) => {
  const [particleCount, setParticleCount] = useState(getParticleCount);

  useEffect(() => {
    const mqMobile = window.matchMedia('(max-width: 768px)');
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    const update = () => setParticleCount(getParticleCount());
    mqMobile.addEventListener('change', update);
    mqMotion.addEventListener('change', update);
    return () => {
      mqMobile.removeEventListener('change', update);
      mqMotion.removeEventListener('change', update);
    };
  }, []);

  const particleColors = useMemo(
    () =>
      theme === 'dark'
        ? ['#e8a090', '#a78bfa', '#f4f4f6']
        : ['#c45c4a', '#8b6fd4', '#d4922a'],
    [theme]
  );

  const pixelRatio = useMemo(
    () => (typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1),
    []
  );

  return (
    <div className="ambient" aria-hidden>
      {particleCount > 0 && (
        <Particles
          className="ambient-particles"
          particleColors={particleColors}
          particleCount={particleCount}
          particleSpread={36}
          speed={0.14}
          particleBaseSize={85}
          moveParticlesOnHover
          particleHoverFactor={0.5}
          alphaParticles
          sizeRandomness={0.75}
          pixelRatio={pixelRatio}
        />
      )}
      <div className="ambient-vignette" />
      <div className="ambient-grid" />
    </div>
  );
};

export default AmbientBackground;
