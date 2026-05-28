import { motion } from 'framer-motion';
import { fadeUp } from '../../motion/presets';

const SectionCard = ({ title, action, children, className = '', span }) => (
  <motion.section
    className={`card section-card ${span || ''} ${className}`.trim()}
    variants={fadeUp}
  >
    {(title || action) && (
      <div className="section-card-head">
        {title && <h2 className="section-title">{title}</h2>}
        {action}
      </div>
    )}
    {children}
  </motion.section>
);

export default SectionCard;
