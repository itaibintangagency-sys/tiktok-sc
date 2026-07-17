'use client';

import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

/**
 * Animasikan angka dari 0 ke `value` saat komponen muncul.
 * `format` opsional untuk custom formatting (default: locale id-ID).
 */
export default function CountUp({ value, format, duration = 0.8 }) {
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (v) =>
    format ? format(v) : Math.round(v).toLocaleString('id-ID')
  );
  const hasAnimated = useRef(false);

  useEffect(() => {
    // Cuma animasi sekali saat mount/value berubah — hindari re-trigger
    // yang bikin angka "loncat-loncat" tiap re-render tidak penting
    const controls = animate(motionValue, value, {
      duration,
      ease: 'easeOut',
    });
    hasAnimated.current = true;
    return () => controls.stop();
  }, [value, duration, motionValue]);

  return <motion.span>{rounded}</motion.span>;
}
