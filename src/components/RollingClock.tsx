import React from 'react';
import { RollingText } from '@kitlangton/rolling-number/react';

interface RollingClockProps {
  /** Pre-formatted clock string, e.g. "24:59" or "01:24:59". */
  text: string;
  /** Animation style: "roll" uses the rolling-number animation; "static" is plain text. */
  clockAnimation: 'roll' | 'static';
  /** Extra classes for sizing/color (inherited by the animated host). */
  className?: string;
  /** Accessible label; defaults to the formatted text. */
  ariaLabel?: string;
  /** Per-change duration in ms (default 500). */
  duration?: number;
  /**
   * Roll direction. "auto" lets RollingText pick (always upward for text), which
   * is wrong for a countdown clock — pass "down" when counting down and "up" when
   * counting up so digits step by one instead of circling the whole wheel.
   */
  direction?: 'up' | 'down' | 'auto';
}

/**
 * Renders a clock string using @kitlangton/rolling-number's RollingText
 * animation, or as static text when the user opts out of motion.
 * The host inherits font sizing/weight/color from the surrounding markup.
 */
export const RollingClock: React.FC<RollingClockProps> = ({
  text,
  clockAnimation,
  className,
  ariaLabel,
  duration = 500,
  direction = 'auto'
}) => {
  if (clockAnimation === 'static') {
    return (
      <span className={className} aria-label={ariaLabel}>
        {text}
      </span>
    );
  }

  return (
    <RollingText
      text={text}
      duration={duration}
      direction={direction}
      className={className}
      aria-label={ariaLabel}
    />
  );
};

export default RollingClock;
