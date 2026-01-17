/**
 * Render a button component from resolved tokens.
 * 
 * IMPORTANT: This renderer must NOT import shadcn/ui. Keep it dumb + deterministic.
 */

import React, { useState } from "react";

export interface ResolvedButtonNode {
  id: string;
  type: "Button";
  props: {
    label: string;
    variant: string;
    size: string;
    disabled: boolean;
  };
  styles: Record<string, string | number>;
  trace: Array<{ key: string; value: string | number; source: string }>;
}

/**
 * Button component that renders using resolved tokens.
 * This is a React component that handles interactive states.
 * 
 * @param node - Resolved button node with props and styles
 */
export function RenderedButton({ node }: { node: ResolvedButtonNode }): React.JSX.Element {
  const { props, styles } = node;
  const { label, disabled, variant } = props;
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Calculate state-based style overrides
  const stateStyles: Record<string, string | number> = {};
  
  if (!disabled) {
    if (isHovered) {
      // Darken background on hover
      if (variant === "primary" && styles.backgroundColor) {
        stateStyles.backgroundColor = darkenColor(styles.backgroundColor as string, 0.1);
      } else if (variant === "secondary" && styles.backgroundColor) {
        stateStyles.backgroundColor = darkenColor(styles.backgroundColor as string, 0.05);
      } else if (variant === "ghost") {
        stateStyles.backgroundColor = "rgba(0, 0, 0, 0.05)";
      }
    }
    
    if (isActive) {
      // Further darken on active and shrink button
      if (variant === "primary" && styles.backgroundColor) {
        stateStyles.backgroundColor = darkenColor(styles.backgroundColor as string, 0.15);
      } else if (variant === "secondary" && styles.backgroundColor) {
        stateStyles.backgroundColor = darkenColor(styles.backgroundColor as string, 0.1);
      } else if (variant === "ghost") {
        stateStyles.backgroundColor = "rgba(0, 0, 0, 0.1)";
      }
      stateStyles.transform = "scale(0.98)";
    }
    
    if (isFocused) {
      // Add focus ring
      stateStyles.outline = "2px solid";
      stateStyles.outlineColor = variant === "primary" 
        ? (styles.color as string || "#0284c7")
        : (styles.color as string || "#0284c7");
      stateStyles.outlineOffset = "2px";
    }
  }

  return (
    <button
      type="button"
      disabled={disabled}
      aria-disabled={disabled}
      onClick={() => {}} // noop
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => !disabled && setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      onFocus={() => !disabled && setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{ ...styles, ...stateStyles, width: "100%", transition: "background-color 0.2s, outline 0.2s, transform 0.1s" }}
    >
      {label}
    </button>
  );
}

/**
 * Helper to darken a color by a percentage
 */
function darkenColor(color: string, amount: number): string {
  // Handle hex colors
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const num = parseInt(hex, 16);
    const r = Math.max(0, ((num >> 16) & 0xff) * (1 - amount));
    const g = Math.max(0, ((num >> 8) & 0xff) * (1 - amount));
    const b = Math.max(0, (num & 0xff) * (1 - amount));
    return `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g).toString(16).padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`;
  }
  // Handle rgb/rgba colors
  if (color.startsWith("rgb")) {
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      const r = Math.max(0, parseInt(match[0]) * (1 - amount));
      const g = Math.max(0, parseInt(match[1]) * (1 - amount));
      const b = Math.max(0, parseInt(match[2]) * (1 - amount));
      const a = match[3] ? `, ${match[3]}` : "";
      return `rgb${match[3] ? "a" : ""}(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}${a})`;
    }
  }
  // Fallback: return original color
  return color;
}
