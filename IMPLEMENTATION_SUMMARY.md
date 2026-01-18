# Implementation Summary: MCP Auto-Fix Demo

## Files Changed

### New Files Created
1. `resolver/types.ts` - Shared type definitions (JsonPatchOperation, AppliedConstraint, Decision, Violation)
2. `resolver/validate.ts` - Read-only validation function for view specs
3. `resolver/suggestFixes.ts` - Constraint-driven fix suggestion logic
4. `mcp/types.ts` - MCP tool parameter and result types
5. `mcp/tools.ts` - MCP tool implementations (getDesignModel, validate, suggestFixes, applyFixes)
6. `mcp/server.ts` - MCP server entry point using @modelcontextprotocol/sdk
7. `tsconfig.mcp.json` - TypeScript config for MCP server build

### Modified Files
1. `resolver/resolveComponent.ts` - Updated ResolvedView schema:
   - Renamed `activeConstraints` → `enabledConstraints` (with backward compatibility)
   - Added `violations: Violation[]`
   - Added `appliedConstraints: AppliedConstraint[]`
   - Added `node.decisions?: Decision[]` to ResolvedNode
2. `app/page.tsx` - Added auto-fix flow:
   - New "Run with MCP (Auto-fix)" button
   - Auto-fix handler that runs validate → suggest → apply → revalidate
   - New "Auto-fix Flow" tab showing step-by-step resolution
   - Preview panel shows resolution status
3. `package.json` - Added dependencies and scripts:
   - `@modelcontextprotocol/sdk`: ^1.0.4
   - `fast-json-patch`: ^3.1.1
   - `tsx`: ^4.19.2 (dev dependency)
   - Scripts: `mcp:dev`, `mcp:build`
4. `README.md` - Added MCP server documentation section

## Schema Changes: Before/After

### Before
```json
{
  "viewId": "demo",
  "nodes": [{
    "id": "button-0",
    "type": "Button",
    "props": { "label": "Continue", "variant": "primary", ... },
    "styles": { ... },
    "trace": [ ... ]
  }],
  "errors": [{
    "code": "multiplePrimaryButtons",
    "message": "Constraint violation (onlyOnePrimaryPerView): Maximum 1 primary button allowed per view, but 2 found"
  }],
  "activeConstraints": {
    "onlyOnePrimaryPerView": true,
    ...
  }
}
```

### After
```json
{
  "viewId": "demo",
  "nodes": [{
    "id": "button-1",
    "type": "Button",
    "props": { "label": "Primary 2", "variant": "secondary", ... },
    "styles": { ... },
    "trace": [ ... ],
    "decisions": [{
      "type": "autoFix",
      "reason": "onlyOnePrimaryPerView constraint violation",
      "action": "downgrade to secondary",
      "details": {
        "originalVariant": "primary",
        "newVariant": "secondary",
        "constraintId": "onlyOnePrimaryPerView"
      }
    }]
  }],
  "errors": [],
  "violations": [],
  "enabledConstraints": {
    "onlyOnePrimaryPerView": true
  },
  "appliedConstraints": [{
    "id": "onlyOnePrimaryPerView",
    "scope": "view",
    "status": "triggered",
    "message": "Only one primary button per view",
    "targets": ["button-1"],
    "resolution": "Downgraded button-1 to secondary to preserve a single primary action",
    "patch": [{
      "op": "replace",
      "path": "/components/1/props/variant",
      "value": "secondary"
    }]
  }],
  "activeConstraints": { ... }  // Backward compatibility
}
```

## How to Run

### Demo App
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### MCP Server
```bash
npm install
npm run mcp:dev
```

The MCP server runs on stdio and can be connected to MCP clients (e.g., Claude Desktop, Cursor).

## Example Usage

### In Demo App
1. Enter prompt: "Create two primary buttons"
2. Add constraint: "Only one primary button per view" (in Constraints tab)
3. Click "Run with MCP (Auto-fix)"
4. View the auto-fix flow:
   - Step 1: Constraint triggered (violations detected)
   - Step 2: Suggested fixes (JSON patches)
   - Step 3: Resolution applied (constraint fired, button downgraded)
   - Step 4: Node decisions (autoFix action on button-1)
   - Step 5: Final state (compliant, resolved)

### Via MCP (Programmatic)
```typescript
// 1. Get design model
const model = await mcp.callTool("getDesignModel", {});

// 2. Validate view spec
const validation = await mcp.callTool("validate", {
  viewSpec: parsedIntent,
  enabledConstraints: { onlyOnePrimaryPerView: true }
});

// 3. If violations, suggest fixes
if (!validation.valid) {
  const fixes = await mcp.callTool("suggestFixes", {
    viewSpec: parsedIntent,
    enabledConstraints: { onlyOnePrimaryPerView: true },
    violations: validation.violations
  });

  // 4. Apply fixes
  const fixed = await mcp.callTool("applyFixes", {
    viewSpec: parsedIntent,
    fixes: fixes.fixes
  });

  // 5. Re-validate
  const final = await mcp.callTool("validate", {
    viewSpec: fixed.viewSpec,
    enabledConstraints: { onlyOnePrimaryPerView: true }
  });
}
```

## Key Features

1. **Backward Compatible**: Old `activeConstraints` field still present for compatibility
2. **Deterministic Fixes**: Always chooses the second primary button (index 1) to downgrade
3. **Structured Output**: Violations, applied constraints, and decisions are clearly separated
4. **Traceable**: Each node includes decisions showing what auto-fixes were applied
5. **MCP-Ready**: Full MCP server implementation for AI agent integration

## Follow-ups / Limitations

1. **Single Constraint Fixer**: Currently only `onlyOnePrimaryPerView` and `maxPrimaryButtonsPerView` have fix suggestions. Other constraints (e.g., `ghostHasNoBackground`) would need additional fixer logic.

2. **Fix Strategy**: The current implementation always downgrades the second primary button. More sophisticated strategies could consider:
   - Button order/importance
   - User intent hints
   - Multiple fix options

3. **MCP Client Integration**: The demo app currently calls the functions directly (not via MCP protocol). For full MCP integration, you'd need to:
   - Run the MCP server as a separate process
   - Use an MCP client library in the Next.js app
   - Handle stdio/transport communication

4. **Error Handling**: The MCP server has basic error handling but could be enhanced with more detailed error messages and validation.

5. **Testing**: No test files were added. Consider adding unit tests for:
   - `suggestFixes()` logic
   - `applyFixesToIntent()` patch application
   - MCP tool implementations
