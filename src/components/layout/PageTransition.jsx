import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingScreen from '@/components/layout/LoadingScreen';
import { pageEnter } from '@/motion/presets';

const PageTransition = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} className="page-wrap" {...pageEnter}>
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
