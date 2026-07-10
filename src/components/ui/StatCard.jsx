import { motion } from 'framer-motion';
import { fadeUp } from '../../motion/presets';

/** Flat stat block — no card chrome. */
const StatCard = ({ label, value, hint, featured = false, delay = 0, children }) => (
  <motion.div
    className={`stat-block ${featured ? 'stat-block-featured' : ''}`}
    variants={fadeUp}
    transition={{ delay }}
  >
    <span className="stat-label">{label}</span>
    <span className={`stat-value ${featured ? 'stat-value-hero' : ''}`}>
      {children ?? value}
    </span>
    {hint && <span className="stat-hint">{hint}</span>}
  </motion.div>
);

export default StatCard;
