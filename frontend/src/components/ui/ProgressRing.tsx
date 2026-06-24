"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value: number; // 0 to 100
  size?: number; // diameter in pixels
  strokeWidth?: number; // stroke width of the ring
  className?: string;
  ringClassName?: string;
  progressClassName?: string;
  showText?: boolean;
  textClassName?: string;
}

export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 6,
  className,
  ringClassName,
  progressClassName,
  showText = true,
  textClassName,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(Math.max(value, 0), 100) / 100) * circumference;

  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg className="rotate-[-90deg]" width={size} height={size}>
        {/* Track circle */}
        <circle
          className={cn("stroke-muted fill-transparent transition-all duration-300", ringClassName)}
          strokeWidth={strokeWidth}
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className={cn("stroke-primary fill-transparent transition-all duration-300 ease-out", progressClassName)}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {showText && (
        <span className={cn("absolute text-xs font-semibold text-foreground font-sans", textClassName)}>
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
}
