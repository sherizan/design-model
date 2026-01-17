# Design Model Demo

A public demo application showcasing the Design Model architecture for generating UI components from design tokens, contracts, and constraints.

## What This Demo Proves

This demo proves that **Design Models are executable**. It demonstrates:

1. **Deterministic Parsing**: Natural language prompts are parsed into structured component definitions without AI calls
2. **Constraint Enforcement**: Design constraints (e.g., "only one primary button per view") are enforced at resolution time
3. **Token Resolution**: Design tokens are resolved to actual CSS values
4. **Pure Rendering**: Components are rendered from resolved tokens without external UI library dependencies

## Architecture

```
Tokens + Contract + Constraints -> Parser -> Resolver -> Resolved JSON -> Renderer -> UI
```

### Architecture Flow

1. **Tokens** (`tokens/tokens.json`): Semantic design tokens (colors, spacing, typography, etc.)
2. **Contract** (`contracts/button.json`): Component contract defining props, types, and defaults
3. **Constraints** (`constraints/button.rules.json`): Executable design rules (e.g., onlyOnePrimaryPerView)
4. **Parser** (`resolver/parseIntent.ts`): Converts natural language prompts to structured intent
5. **Resolver** (`resolver/resolveComponent.ts`): Validates props, enforces constraints, resolves tokens to CSS values
6. **Renderer** (`renderer/renderButton.tsx`): Pure function that renders `<button>` with inline styles
7. **UI**: Preview canvas displays the rendered component

### ⚠️ IMPORTANT: shadcn/ui Usage

**shadcn/ui is used ONLY for the demo shell** (layout, panels, tabs, inputs, code area, run/reset controls).

**The rendered component preview must be our own renderer output**, using ONLY:
- `tokens/tokens.json`
- `contracts/*.json`
- `constraints/*.json`
- Resolver logic

**The renderer MUST NOT import or depend on shadcn components.** The preview output for components (e.g., Button) must be a plain `<button>` (or our own internal component), styled using resolved tokens (inline styles or simple class mapping).

## Project Structure

```
design-model/
├── app/
│   ├── layout.tsx          # Root layout
│   └── page.tsx             # Demo shell (uses shadcn/ui)
├── tokens/
│   └── tokens.json          # Semantic design tokens
├── contracts/
│   └── button.json          # Button component contract
├── constraints/
│   ├── button.rules.json    # Button constraint rules (base)
│   └── button.templates.ts  # Constraint template catalog
├── resolver/
│   ├── parseIntent.ts       # Parse user intent from prompt
│   └── resolveComponent.ts  # Resolve component from contract + tokens
├── renderer/
│   └── renderButton.tsx     # Render button (NO shadcn imports)
└── components/
    └── ui/                   # shadcn/ui components (shell only)
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Demo Prompts

### Happy Path

Try this prompt (default on page load):
```
Create a primary button with label "Continue"
```

This will:
- Parse the intent
- Resolve tokens to CSS values
- Render a primary button with proper styling

### Constraint Failure

Try this prompt:
```
Create two primary buttons
```

**Without constraints**: This will pass and render two primary buttons.

**With constraints**: 
1. Go to the Constraints tab in the Model Editor
2. Type "only one" in the search field
3. Click "Only one primary button per view" to add it as a pill
4. Click Run
5. This will:
   - Parse the intent (creates two primary buttons)
   - Fail constraint validation (`onlyOnePrimaryPerView`)
   - Show error message referencing the constraint
   - Prevent rendering (nodes array is empty)
6. Remove the constraint pill and Run again → it will pass

## Author Constraints as Pills

The Constraints tab uses a **pill-based authoring system** that proves Design Models are structured and deterministic:

- **Constraints start empty by default** - no constraints are active initially
- **Add constraints from template catalog** - type to search and select from predefined constraint templates
- **Constraints are structured templates** - no free-form text or AI generation, only deterministic templates
- **Live constraint enforcement** - constraints are applied immediately when you click Run

### Example Workflow

1. Start with empty constraints (no pills shown)
2. Prompt: "Create two primary buttons" → **PASSES** (renders two buttons)
3. Add constraint pill: "Only one primary button per view"
4. Run same prompt → **FAILS** with clear error message
5. Remove constraint pill → **PASSES** again

This demonstrates that constraints are **executable rules** that can be toggled on/off, proving the deterministic nature of Design Models.

## Technology Stack

- **Next.js 16** - App Router with TypeScript
- **Tailwind CSS** - Styling
- **shadcn/ui** - Demo shell UI components only
- **React** - Component rendering

## Development

The resolver and renderer logic are fully implemented. The system:

- Parses natural language prompts deterministically
- Validates component props against contracts
- Enforces design constraints
- Resolves design tokens to CSS values
- Renders pure HTML elements with inline styles
