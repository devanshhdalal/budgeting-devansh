import { motion } from 'framer-motion';
import { fadeUp } from '../../motion/presets';

const PageHeader = ({ eyebrow, title, subtitle, action }) => (
  <motion.header className="page-header" variants={fadeUp}>
    <div className="page-header-text">
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
    {action && <div className="page-header-action">{action}</div>}
  </motion.header>
);

export default PageHeader;
