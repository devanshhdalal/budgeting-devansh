import { motion } from 'framer-motion';

const AmbientBackground = () => (
  <div className="ambient" aria-hidden>
    <motion.div
      className="ambient-orb ambient-orb-a"
      animate={{ x: [0, 30, -20, 0], y: [0, -40, 20, 0] }}
      transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="ambient-orb ambient-orb-b"
      animate={{ x: [0, -40, 25, 0], y: [0, 30, -25, 0] }}
      transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
    />
    <div className="ambient-grid" />
  </div>
);

export default AmbientBackground;
