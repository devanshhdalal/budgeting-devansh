import { motion } from 'framer-motion';
import { fadeUp } from '../../motion/presets';

/** Flat page section — no card chrome. */
const SectionCard = ({ title, action, children, className = '', span }) => (
  <motion.section
    className={`page-section ${span || ''} ${className}`.trim()}
    variants={fadeUp}
  >
    {(title || action) && (
      <div className="page-section-head">
        {title && <h2 className="page-section-title">{title}</h2>}
        {action}
      </div>
    )}
    {children}
  </motion.section>
);

export default SectionCard;
