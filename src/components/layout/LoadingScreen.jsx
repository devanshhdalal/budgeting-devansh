import { motion } from 'framer-motion';

const LOGO_URL = '/brand/logo-mark.png';

const LoadingScreen = ({ label = 'Loading your budget' }) => (
  <div className="loading-screen" role="status" aria-live="polite">
    <motion.img
      src={LOGO_URL}
      alt=""
      className="loading-logo"
      aria-hidden
      animate={{ opacity: [0.72, 1, 0.72], scale: [0.96, 1, 0.96] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.p
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="loading-label"
    >
      {label}
    </motion.p>
  </div>
);

export default LoadingScreen;
