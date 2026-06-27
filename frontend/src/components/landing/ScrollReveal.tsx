"use client";

import { ReactNode } from "react";
import { motion, useInView, Variants } from "framer-motion";
import { useRef } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
}

export function ScrollReveal({
  children,
  className = "",
  delay = 0,
  duration = 700,
  direction = "up",
}: ScrollRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-10% 0px" });

  const getVariants = (): Variants => {
    const base = {
      hidden: { opacity: 0 },
      visible: { 
        opacity: 1,
        transition: {
          duration: duration / 1000,
          delay: delay / 1000,
          ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
        }
      }
    };

    switch (direction) {
      case "up":
        return {
          ...base,
          hidden: { ...base.hidden, y: 40, scale: 0.98 },
          visible: { ...base.visible, y: 0, scale: 1 }
        };
      case "down":
        return {
          ...base,
          hidden: { ...base.hidden, y: -40, scale: 0.98 },
          visible: { ...base.visible, y: 0, scale: 1 }
        };
      case "left":
        return {
          ...base,
          hidden: { ...base.hidden, x: 40 },
          visible: { ...base.visible, x: 0 }
        };
      case "right":
        return {
          ...base,
          hidden: { ...base.hidden, x: -40 },
          visible: { ...base.visible, x: 0 }
        };
      case "none":
      default:
        return base;
    }
  };

  return (
    <motion.div
      ref={ref}
      variants={getVariants()}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      className={className}
    >
      {children}
    </motion.div>
  );
}
