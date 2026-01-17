/**
 * Resolve component configuration from contract, tokens, and constraints.
 */

import type { ParsedIntent } from "./parseIntent";
import tokensData from "../tokens/tokens.json";
import contractData from "../contracts/button.json";
import constraintsData from "../constraints/button.rules.json";

export interface ResolveOptions {
  tokens?: typeof tokensData;
  contract?: typeof contractData;
  constraints?: typeof constraintsData;
}

export interface ResolvedView {
  viewId: string;
  nodes: Array<{
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
  }>;
  errors: Array<{ code: string; message: string }>;
  activeConstraints?: Record<string, any>;
}

/**
 * Resolves token reference to actual value.
 * Supports nested paths like "spacing.sm" or "color.primary"
 */
function resolveToken(tokenPath: string, tokens: any): string {
  const parts = tokenPath.split(".");
  let value = tokens;
  for (const part of parts) {
    value = value?.[part];
    if (value === undefined) {
      return tokenPath; // Return path if not found
    }
  }
  return typeof value === "string" ? value : String(value);
}

/**
 * Converts spacing token (e.g., "0.75rem") to pixel number.
 */
function spacingToPx(spacingValue: string): number {
  const remMatch = spacingValue.match(/([\d.]+)rem/);
  if (remMatch) {
    return parseFloat(remMatch[1]) * 16; // 1rem = 16px
  }
  return 0;
}

/**
 * Resolves a component configuration from intent, contract, tokens, and constraints.
 * 
 * @param intent - The parsed user intent
 * @param options - Optional injected tokens, contract, and constraints (defaults to JSON files)
 */
export function resolveComponent(intent: ParsedIntent, options?: ResolveOptions): ResolvedView {
  // Use injected values if provided, otherwise fall back to imported JSON files
  const tokens = options?.tokens ?? tokensData;
  const contract = options?.contract ?? contractData;
  const constraints = options?.constraints ?? constraintsData;

  const errors: Array<{ code: string; message: string }> = [];
  const nodes: ResolvedView["nodes"] = [];

  // Validate components against contract
  for (let i = 0; i < intent.components.length; i++) {
    const component = intent.components[i];
    
    if (component.type !== "Button") {
      errors.push({
        code: "invalidComponentType",
        message: `Unsupported component type: ${component.type}`,
      });
      continue;
    }

    // Validate required props
    if (!component.props.label) {
      errors.push({
        code: "missingLabel",
        message: constraints.errorMessages.missingLabel,
      });
      continue;
    }

    // Validate variant
    const validVariants = contract.props.variant.enum;
    if (!validVariants.includes(component.props.variant)) {
      errors.push({
        code: "invalidVariant",
        message: constraints.errorMessages.invalidVariant,
      });
      continue;
    }

    // Validate size
    const validSizes = contract.props.size.enum;
    if (!validSizes.includes(component.props.size)) {
      errors.push({
        code: "invalidSize",
        message: constraints.errorMessages.invalidSize,
      });
      continue;
    }
  }

  // Enforce constraint: maxPrimaryButtonsPerView or onlyOnePrimaryPerView
  const primaryButtons = intent.components.filter(
    (c) => c.props.variant === "primary"
  );
  
  // Determine maxPrimaryAllowed
  let maxPrimaryAllowed: number;
  if ("maxPrimaryButtonsPerView" in constraints && typeof (constraints as any).maxPrimaryButtonsPerView === "number") {
    maxPrimaryAllowed = (constraints as any).maxPrimaryButtonsPerView;
  } else if (constraints.onlyOnePrimaryPerView === true) {
    maxPrimaryAllowed = 1;
  } else {
    maxPrimaryAllowed = Infinity;
  }

  if (primaryButtons.length > maxPrimaryAllowed) {
    const constraintId = ("maxPrimaryButtonsPerView" in constraints && typeof (constraints as any).maxPrimaryButtonsPerView === "number")
      ? "maxPrimaryButtonsPerView" 
      : "onlyOnePrimaryPerView";
    errors.push({
      code: "multiplePrimaryButtons",
      message: `Constraint violation (${constraintId}): Maximum ${maxPrimaryAllowed} primary button${maxPrimaryAllowed === 1 ? "" : "s"} allowed per view, but ${primaryButtons.length} found`,
    });
    // If constraint fails, return empty nodes
    return {
      viewId: intent.viewId,
      nodes: [],
      errors,
    };
  }

  // If there are validation errors, return empty nodes
  if (errors.length > 0) {
    return {
      viewId: intent.viewId,
      nodes: [],
      errors,
    };
  }

  // Resolve styles for each component
  for (let i = 0; i < intent.components.length; i++) {
    const component = intent.components[i];
    const { variant, size, disabled, label } = component.props;

    // Build base styles and trace
    const styles: Record<string, string | number> = {};
    const trace: Array<{ key: string; value: string | number; source: string }> = [];

    // Resolve variant styles
    if (variant === "primary") {
      const bgColor = resolveToken("color.primary", tokens);
      styles.backgroundColor = bgColor;
      trace.push({ key: "backgroundColor", value: bgColor, source: "token: color.primary" });

      const textColor = resolveToken("color.onPrimary", tokens);
      styles.color = textColor;
      trace.push({ key: "color", value: textColor, source: "token: color.onPrimary" });
    } else if (variant === "secondary") {
      if (constraints.secondaryUsesSurface) {
        const bgColor = resolveToken("color.surface", tokens);
        styles.backgroundColor = bgColor;
        trace.push({ key: "backgroundColor", value: bgColor, source: "constraint(active): secondaryUsesSurface → token: color.surface" });

        const textColor = resolveToken("color.onSurface", tokens);
        styles.color = textColor;
        trace.push({ key: "color", value: textColor, source: "token: color.onSurface" });

        styles.border = "1px solid rgba(0,0,0,0.1)";
        trace.push({ key: "border", value: "1px solid rgba(0,0,0,0.1)", source: "rule: secondary variant → border" });
      }
    } else if (variant === "ghost") {
      if (constraints.ghostHasNoBackground) {
        styles.backgroundColor = "transparent";
        trace.push({ key: "backgroundColor", value: "transparent", source: "constraint(active): ghostHasNoBackground" });
      }
      const textColor = resolveToken("color.primary", tokens);
      styles.color = textColor;
      trace.push({ key: "color", value: textColor, source: "token: color.primary" });
    }

    // Resolve size-based padding
    const sizeMap = constraints.sizeMap[size];
    if (sizeMap) {
      const pxTokenPath = sizeMap.px;
      const pyTokenPath = sizeMap.py;
      const pxToken = resolveToken(pxTokenPath, tokens);
      const pyToken = resolveToken(pyTokenPath, tokens);
      const pxPx = spacingToPx(pxToken);
      const pyPx = spacingToPx(pyToken);
      const paddingValue = `${pyPx}px ${pxPx}px`;
      styles.padding = paddingValue;
      trace.push({ 
        key: "padding", 
        value: paddingValue, 
        source: `constraint(active): sizeMap.${size}.py → token: ${pyTokenPath} → ${pyPx}px, constraint(active): sizeMap.${size}.px → token: ${pxTokenPath} → ${pxPx}px` 
      });
    }

    // Resolve typography
    const fontSize = resolveToken("typography.button.fontSize", tokens);
    styles.fontSize = fontSize;
    trace.push({ key: "fontSize", value: fontSize, source: "token: typography.button.fontSize" });

    const fontWeight = resolveToken("typography.button.fontWeight", tokens);
    styles.fontWeight = fontWeight;
    trace.push({ key: "fontWeight", value: fontWeight, source: "token: typography.button.fontWeight" });

    const lineHeight = resolveToken("typography.button.lineHeight", tokens);
    styles.lineHeight = lineHeight;
    trace.push({ key: "lineHeight", value: lineHeight, source: "token: typography.button.lineHeight" });

    // Resolve border radius
    const borderRadius = resolveToken("radius.md", tokens);
    styles.borderRadius = borderRadius;
    trace.push({ key: "borderRadius", value: borderRadius, source: "token: radius.md" });

    // Apply disabled state
    if (disabled) {
      styles.opacity = constraints.disabledOpacity;
      const opacityValue = constraints.disabledOpacity;
      const constraintId = "disabledOpacity";
      trace.push({ 
        key: "opacity", 
        value: opacityValue, 
        source: `constraint(active): ${constraintId}${typeof opacityValue === "number" ? `=${opacityValue}` : ""}` 
      });
      styles.cursor = "not-allowed";
      trace.push({ key: "cursor", value: "not-allowed", source: "rule: disabled → not-allowed" });
    } else {
      styles.cursor = "pointer";
      trace.push({ key: "cursor", value: "pointer", source: "rule: default → pointer" });
    }

    // Add border for secondary variant (if not already added)
    if (variant === "secondary" && !styles.border) {
      styles.border = "1px solid rgba(0,0,0,0.1)";
      trace.push({ key: "border", value: "1px solid rgba(0,0,0,0.1)", source: "rule: secondary variant → border" });
    }

    nodes.push({
      id: `button-${i}`,
      type: "Button",
      props: {
        label,
        variant,
        size,
        disabled,
      },
      styles,
      trace,
    });
  }

  return {
    viewId: intent.viewId,
    nodes,
    errors,
    activeConstraints: constraints,
  };
}
