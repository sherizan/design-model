/**
 * Constraint template catalog for Button component.
 * These templates define structured, deterministic constraints that can be authored as pills.
 */

export type ConstraintTemplate = {
  id: string;
  label: string;
  description?: string;
  kind: "toggle" | "number";
  defaultValue?: any;
  toPatch: (value?: any) => Record<string, any>;
};

export const BUTTON_CONSTRAINT_TEMPLATES: ConstraintTemplate[] = [
  {
    id: "onlyOnePrimaryPerView",
    label: "Only one primary button per view",
    description: "Enforces that only one primary button can exist in a single view",
    kind: "toggle",
    toPatch: (value = true) => ({ onlyOnePrimaryPerView: value }),
  },
  {
    id: "ghostHasNoBackground",
    label: "Ghost buttons have no background",
    description: "Ghost variant buttons must have transparent background",
    kind: "toggle",
    toPatch: (value = true) => ({ ghostHasNoBackground: value }),
  },
  {
    id: "disabledOpacity",
    label: "Disabled buttons reduce opacity",
    description: "Sets the opacity value for disabled buttons (0-1)",
    kind: "number",
    defaultValue: 0.4,
    toPatch: (value = 0.4) => ({ disabledOpacity: value }),
  },
  {
    id: "maxPrimaryButtonsPerView",
    label: "Max primary buttons per view",
    description: "Maximum number of primary buttons allowed in a single view",
    kind: "number",
    defaultValue: 1,
    toPatch: (value = 1) => ({ maxPrimaryButtonsPerView: value }),
  },
];
