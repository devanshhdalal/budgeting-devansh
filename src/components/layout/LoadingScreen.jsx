import { motion } from 'framer-motion';

const LoadingScreen = ({ label = 'Loading your budget' }) => (
  <div className="loading-screen" role="status" aria-live="polite">
    <div className="loading-mark" aria-hidden />
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
