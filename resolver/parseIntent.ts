/**
 * Parse user intent from a natural language prompt.
 * Deterministic parser (no AI calls).
 */

export interface ParsedIntent {
  viewId: string;
  components: Array<{
    type: "Button";
    props: {
      label: string;
      variant: "primary" | "secondary" | "ghost";
      size: "sm" | "md";
      disabled: boolean;
    };
  }>;
}

/**
 * Parses a natural language prompt into a structured intent.
 * 
 * Supported patterns:
 * - "Create a primary button with label \"Continue\""
 * - "Create a button labeled Continue"
 * - "Create two primary buttons" → two Button components
 * - "Create one primary button \"Continue\" and one ghost button with label \"Cancel\"" → two buttons with different variants/labels
 * - If prompt includes "disabled", set disabled=true
 * 
 * @param prompt - The user's natural language prompt
 * @returns A parsed intent object with viewId and components array
 */
export function parseIntent(prompt: string): ParsedIntent {
  const lowerPrompt = prompt.toLowerCase();
  
  // Check for "and" pattern: "a/one X button ... and a/one Y button ..."
  // Also handles: "a X button ... and Y button ..." (without "a" before second button)
  const andPattern = /(?:a|one)\s+(\w+)\s+button[^"]*(?:with\s+label\s+)?(?:"([^"]+)")?[^"]*and\s+(?:a|one)?\s*(\w+)\s+button[^"]*(?:with\s+label\s+)?(?:"([^"]+)")?/i;
  const andMatch = prompt.match(andPattern);
  
  if (andMatch) {
    // Parse multiple buttons with different variants and labels
    const components: ParsedIntent["components"] = [];
    
    // First button
    const variant1 = extractVariant(andMatch[1]);
    const label1 = andMatch[2] || extractLabelFromContext(prompt, 1) || "Button 1";
    const disabled1 = lowerPrompt.includes("disabled");
    const size1 = extractSize(lowerPrompt);
    
    components.push({
      type: "Button",
      props: {
        label: label1,
        variant: variant1,
        size: size1,
        disabled: disabled1,
      },
    });
    
    // Second button
    const variant2 = extractVariant(andMatch[3]);
    const label2 = andMatch[4] || extractLabelFromContext(prompt, 2) || "Button 2";
    const disabled2 = lowerPrompt.includes("disabled");
    const size2 = extractSize(lowerPrompt);
    
    components.push({
      type: "Button",
      props: {
        label: label2,
        variant: variant2,
        size: size2,
        disabled: disabled2,
      },
    });
    
    return {
      viewId: "demo",
      components,
    };
  }
  
  // Original single/multiple button logic
  // Extract variant
  let variant: "primary" | "secondary" | "ghost" = "primary";
  if (lowerPrompt.includes("secondary")) {
    variant = "secondary";
  } else if (lowerPrompt.includes("ghost")) {
    variant = "ghost";
  } else if (lowerPrompt.includes("primary")) {
    variant = "primary";
  }
  
  // Extract disabled state
  const disabled = lowerPrompt.includes("disabled");
  
  // Extract size (default to md)
  let size: "sm" | "md" = "md";
  if (lowerPrompt.includes("small") || lowerPrompt.includes(" sm ")) {
    size = "sm";
  }
  
  // Extract label from quoted text or "labeled" pattern
  let label = "Continue"; // default
  const quotedMatch = prompt.match(/"([^"]+)"/);
  const labeledMatch = prompt.match(/labeled\s+(\w+)/i);
  if (quotedMatch) {
    label = quotedMatch[1];
  } else if (labeledMatch) {
    label = labeledMatch[1];
  }
  
  // Count how many buttons to create
  let buttonCount = 1;
  const twoMatch = lowerPrompt.match(/(two|2)\s+(primary\s+)?buttons?/);
  if (twoMatch) {
    buttonCount = 2;
  }
  
  // Generate components array
  const components: ParsedIntent["components"] = [];
  for (let i = 0; i < buttonCount; i++) {
    let componentLabel = label;
    // If multiple buttons and label was explicitly provided, use it for all
    // Otherwise, for multiple primary buttons without explicit label, use "Primary 1", "Primary 2", etc.
    if (buttonCount > 1 && variant === "primary" && !quotedMatch && !labeledMatch) {
      componentLabel = `Primary ${i + 1}`;
    }
    
    components.push({
      type: "Button",
      props: {
        label: componentLabel,
        variant,
        size,
        disabled,
      },
    });
  }
  
  return {
    viewId: "demo",
    components,
  };
}

/**
 * Helper to extract variant from text
 */
function extractVariant(text: string): "primary" | "secondary" | "ghost" {
  const lower = text.toLowerCase();
  if (lower.includes("secondary")) return "secondary";
  if (lower.includes("ghost")) return "ghost";
  if (lower.includes("primary")) return "primary";
  return "primary"; // default
}

/**
 * Helper to extract size from prompt
 */
function extractSize(lowerPrompt: string): "sm" | "md" {
  if (lowerPrompt.includes("small") || lowerPrompt.includes(" sm ")) {
    return "sm";
  }
  return "md";
}

/**
 * Helper to extract label from context (for "and" pattern)
 * Tries to find quoted strings in order
 */
function extractLabelFromContext(prompt: string, index: number): string | null {
  const quotedMatches = prompt.match(/"([^"]+)"/g);
  if (quotedMatches && quotedMatches[index - 1]) {
    return quotedMatches[index - 1].replace(/"/g, "");
  }
  return null;
}
