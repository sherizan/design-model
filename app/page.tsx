"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { X, Github } from "lucide-react";
import { parseIntent } from "@/resolver/parseIntent";
import { resolveComponent, type ResolvedView } from "@/resolver/resolveComponent";
import { RenderedButton } from "@/renderer/renderButton";
import { loadBaseModel, mergeDeep, type BaseModel } from "@/lib/modelRuntime";
import { BUTTON_CONSTRAINT_TEMPLATES, type ConstraintTemplate } from "@/constraints/button.templates";
import contractData from "@/contracts/button.json";

type Status = "ready" | "success" | "error";

export default function Home() {
  const [prompt, setPrompt] = useState('Create a primary button with label "Continue"');
  const [resolvedView, setResolvedView] = useState<ResolvedView | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("ready");

  // Base model (loaded once on mount)
  const [baseModel, setBaseModel] = useState<BaseModel | null>(null);

  // Overrides (in-memory only)
  const [tokenOverrides, setTokenOverrides] = useState<Partial<BaseModel["tokens"]>>({});
  const [autoRunOnApply, setAutoRunOnApply] = useState(false);

  // Token form state (temporary, before Apply)
  const [tokenFormState, setTokenFormState] = useState({
    colorPrimary: "#0284c7",
    colorOnPrimary: "#f0f9ff",
    radiusMd: "0.5",
    spacingMd: "1",
  });

  // Active constraints (pills)
  const [activeConstraints, setActiveConstraints] = useState<Array<{ templateId: string; value?: boolean | number }>>([]);
  const [constraintSearchInput, setConstraintSearchInput] = useState("");

  // Load base model on mount
  useEffect(() => {
    const model = loadBaseModel();
    setBaseModel(model);
    // Initialize form state from base model
    setTokenFormState({
      colorPrimary: model.tokens.color.primary,
      colorOnPrimary: model.tokens.color.onPrimary,
      radiusMd: parseFloat(model.tokens.radius.md.replace("rem", "")).toString(),
      spacingMd: parseFloat(model.tokens.spacing.md.replace("rem", "")).toString(),
    });
    // Constraints start empty - user adds them as pills
  }, []);

  // Compute derived values
  const derivedTokens = useMemo(() => {
    if (!baseModel) return null;
    return mergeDeep(baseModel.tokens, tokenOverrides);
  }, [baseModel, tokenOverrides]);

  // Derive constraintOverrides from activeConstraints
  const constraintOverrides = useMemo(() => {
    return activeConstraints.reduce((acc, active) => {
      const template = BUTTON_CONSTRAINT_TEMPLATES.find((t) => t.id === active.templateId);
      if (template) {
        const patch = template.toPatch(active.value);
        return mergeDeep(acc, patch);
      }
      return acc;
    }, {} as Partial<BaseModel["constraints"]>);
  }, [activeConstraints]);

  const derivedConstraints = useMemo(() => {
    if (!baseModel) return null;
    // When no constraints are active, disable onlyOnePrimaryPerView to allow multiple primary buttons
    const baseConstraints = { ...baseModel.constraints };
    if (activeConstraints.length === 0) {
      baseConstraints.onlyOnePrimaryPerView = false;
    }
    return mergeDeep(baseConstraints, constraintOverrides);
  }, [baseModel, constraintOverrides, activeConstraints.length]);

  const handleRun = () => {
    if (!baseModel || !derivedTokens || !derivedConstraints) return;

    try {
      // Parse intent from prompt
      const intent = parseIntent(prompt);
      
      // Resolve component with derived tokens, contract, and constraints
      const resolved = resolveComponent(intent, {
        tokens: derivedTokens,
        contract: baseModel.contract,
        constraints: derivedConstraints,
      });
      
      // Convert activeConstraints pills to constraints object for JSON display
      const activeConstraintsObject = activeConstraints.reduce((acc, active) => {
        const template = BUTTON_CONSTRAINT_TEMPLATES.find((t) => t.id === active.templateId);
        if (template) {
          const patch = template.toPatch(active.value);
          return mergeDeep(acc, patch);
        }
        return acc;
      }, {} as Record<string, any>);
      
      // Add activeConstraints from pills (not the full derived constraints)
      const resolvedWithActiveConstraints = {
        ...resolved,
        activeConstraints: activeConstraintsObject,
      };
      
      setResolvedView(resolvedWithActiveConstraints);
      setErrors(resolved.errors.map((e) => e.message));
      setStatus(resolved.errors.length > 0 ? "error" : "success");
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "Unknown error occurred"]);
      setResolvedView(null);
      setStatus("error");
    }
  };

  const handleApplyTokens = () => {
    if (!baseModel) return;
    
    const overrides: Partial<BaseModel["tokens"]> = {};
    
    if (tokenFormState.colorPrimary !== baseModel.tokens.color.primary) {
      overrides.color = { ...(overrides.color || {}), primary: tokenFormState.colorPrimary } as any;
    }
    if (tokenFormState.colorOnPrimary !== baseModel.tokens.color.onPrimary) {
      overrides.color = { ...(overrides.color || {}), onPrimary: tokenFormState.colorOnPrimary } as any;
    }
    if (tokenFormState.radiusMd !== parseFloat(baseModel.tokens.radius.md.replace("rem", "")).toString()) {
      overrides.radius = { ...(overrides.radius || {}), md: `${tokenFormState.radiusMd}rem` } as any;
    }
    if (tokenFormState.spacingMd !== parseFloat(baseModel.tokens.spacing.md.replace("rem", "")).toString()) {
      overrides.spacing = { ...(overrides.spacing || {}), md: `${tokenFormState.spacingMd}rem` } as any;
    }

    setTokenOverrides(overrides);
    if (autoRunOnApply) {
      setTimeout(handleRun, 0);
    }
  };

  const handleResetTokens = () => {
    setTokenOverrides({});
    if (baseModel) {
      setTokenFormState({
        colorPrimary: baseModel.tokens.color.primary,
        colorOnPrimary: baseModel.tokens.color.onPrimary,
        radiusMd: parseFloat(baseModel.tokens.radius.md.replace("rem", "")).toString(),
        spacingMd: parseFloat(baseModel.tokens.spacing.md.replace("rem", "")).toString(),
      });
    }
  };

  // Filter templates based on search input
  const matchingTemplates = useMemo(() => {
    const searchLower = constraintSearchInput.toLowerCase();
    if (!searchLower) return BUTTON_CONSTRAINT_TEMPLATES;
    return BUTTON_CONSTRAINT_TEMPLATES.filter((template) =>
      template.label.toLowerCase().includes(searchLower)
    );
  }, [constraintSearchInput]);

  const handleAddConstraint = (template: ConstraintTemplate) => {
    // Prevent duplicates
    if (activeConstraints.some((ac) => ac.templateId === template.id)) {
      return;
    }

    const value = template.kind === "toggle" ? true : template.defaultValue;
    setActiveConstraints([...activeConstraints, { templateId: template.id, value }]);
    setConstraintSearchInput("");
  };

  const handleRemoveConstraint = (templateId: string) => {
    setActiveConstraints(activeConstraints.filter((ac) => ac.templateId !== templateId));
  };

  const handleUpdateConstraintValue = (templateId: string, value: boolean | number) => {
    setActiveConstraints(
      activeConstraints.map((ac) => (ac.templateId === templateId ? { ...ac, value } : ac))
    );
  };

  const handleClearConstraints = () => {
    setActiveConstraints([]);
  };

  const handleAddDefaults = () => {
    const defaults = [
      BUTTON_CONSTRAINT_TEMPLATES.find((t) => t.id === "onlyOnePrimaryPerView"),
      BUTTON_CONSTRAINT_TEMPLATES.find((t) => t.id === "disabledOpacity"),
    ].filter(Boolean) as ConstraintTemplate[];

    const newConstraints = defaults
      .filter((template) => !activeConstraints.some((ac) => ac.templateId === template.id))
      .map((template) => ({
        templateId: template.id,
        value: template.kind === "toggle" ? true : template.defaultValue,
      }));

    if (newConstraints.length > 0) {
      setActiveConstraints([...activeConstraints, ...newConstraints]);
    }
  };

  const resolvedJson = resolvedView
    ? JSON.stringify(resolvedView, null, 2)
    : "null";

  const contractJson = baseModel
    ? JSON.stringify(baseModel.contract, null, 2)
    : JSON.stringify(contractData, null, 2);

  // Get effective tokens excerpt (only edited keys)
  const effectiveTokensExcerpt = useMemo(() => {
    if (!baseModel || Object.keys(tokenOverrides).length === 0) return null;
    return tokenOverrides;
  }, [baseModel, tokenOverrides]);


  // Show toast when status changes
  useEffect(() => {
    if (status === "success") {
      toast.success("Success", {
        duration: 3000,
        className: "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200",
      });
    } else if (status === "error") {
      toast.error("Error", {
        duration: 3000,
      });
    }
  }, [status]);

  if (!baseModel) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen w-full bg-background relative">
      <Toaster position="bottom-right" />
      
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Design Model</h1>
        <a
          href="https://github.com/sherizan/design-model"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Github className="h-4 w-4" />
          <span>View on GitHub</span>
        </a>
      </header>
      
      {/* Row 1: Prompt and Controls */}
      <div className="border-b border-border p-4">
        <div className="flex gap-4 items-end max-w-2xl">
          <div className="flex-1">
            <label htmlFor="prompt" className="text-sm font-medium mb-2 block">
              Prompt
            </label>
            <Textarea
              id="prompt"
              placeholder="Enter your design prompt here..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
          <div className="min-w-[200px]">
            <Button onClick={handleRun} className="w-full">
              Run
            </Button>
          </div>
        </div>
      </div>

      {/* Row 2: 3 Columns */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Model Editor Panel */}
        <div className="w-1/3 border-r border-border">
          <Card className="h-full rounded-none border-0">
            <CardHeader>
              <CardTitle>Design Model</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-5rem)]">
              <Tabs defaultValue="tokens" className="h-full">
                <TabsList>
                  <TabsTrigger value="tokens">Tokens</TabsTrigger>
                  <TabsTrigger value="contract">Contract</TabsTrigger>
                  <TabsTrigger value="constraints">Constraints</TabsTrigger>
                </TabsList>
                
                {/* Tokens Tab - Editable */}
                <TabsContent value="tokens" className="h-[calc(100%-3rem)] mt-4">
                  <ScrollArea className="h-full w-full">
                    <div className="space-y-4 p-4">
                      <div className="space-y-2">
                        <Label htmlFor="colorPrimary">color.primary</Label>
                        <div className="flex gap-2">
                          <Input
                            id="colorPrimary"
                            type="color"
                            value={tokenFormState.colorPrimary}
                            onChange={(e) => setTokenFormState({ ...tokenFormState, colorPrimary: e.target.value })}
                            className="w-16 h-9"
                          />
                          <Input
                            type="text"
                            value={tokenFormState.colorPrimary}
                            onChange={(e) => setTokenFormState({ ...tokenFormState, colorPrimary: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="colorOnPrimary">color.onPrimary</Label>
                        <div className="flex gap-2">
                          <Input
                            id="colorOnPrimary"
                            type="color"
                            value={tokenFormState.colorOnPrimary}
                            onChange={(e) => setTokenFormState({ ...tokenFormState, colorOnPrimary: e.target.value })}
                            className="w-16 h-9"
                          />
                          <Input
                            type="text"
                            value={tokenFormState.colorOnPrimary}
                            onChange={(e) => setTokenFormState({ ...tokenFormState, colorOnPrimary: e.target.value })}
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="radiusMd">radius.md (rem)</Label>
                        <Input
                          id="radiusMd"
                          type="number"
                          step="0.1"
                          value={tokenFormState.radiusMd}
                          onChange={(e) => setTokenFormState({ ...tokenFormState, radiusMd: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="spacingMd">spacing.md (rem)</Label>
                        <Input
                          id="spacingMd"
                          type="number"
                          step="0.1"
                          value={tokenFormState.spacingMd}
                          onChange={(e) => setTokenFormState({ ...tokenFormState, spacingMd: e.target.value })}
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button onClick={handleApplyTokens} className="flex-1">
                          Apply Tokens
                        </Button>
                        <Button onClick={handleResetTokens} variant="outline" className="flex-1">
                          Reset Tokens
                        </Button>
                      </div>

                      <div className="flex items-center space-x-2 pt-2">
                        <Switch
                          id="autoRunTokens"
                          checked={autoRunOnApply}
                          onCheckedChange={setAutoRunOnApply}
                        />
                        <Label htmlFor="autoRunTokens" className="text-xs">
                          Auto-run on apply
                        </Label>
                      </div>

                      {effectiveTokensExcerpt && (
                        <div className="pt-4 border-t">
                          <p className="text-xs font-medium mb-2">Effective tokens (excerpt):</p>
                          <pre className="text-xs font-mono bg-muted p-2 rounded overflow-auto">
                            {JSON.stringify(effectiveTokensExcerpt, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Contract Tab - Read-only */}
                <TabsContent value="contract" className="h-[calc(100%-3rem)] mt-4">
                  <ScrollArea className="h-full w-full rounded-md border border-border p-4">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                      {contractJson}
                    </pre>
                  </ScrollArea>
                </TabsContent>

                {/* Constraints Tab - Pill-based Authoring */}
                <TabsContent value="constraints" className="h-[calc(100%-3rem)] mt-4">
                  <ScrollArea className="h-full w-full">
                    <div className="space-y-4 p-4">
                      {/* Active constraints pills */}
                      {activeConstraints.length > 0 ? (
                        <div className="space-y-2">
                          <Label>Active constraints</Label>
                          <div className="flex flex-wrap gap-2">
                            {activeConstraints.map((active) => {
                              const template = BUTTON_CONSTRAINT_TEMPLATES.find((t) => t.id === active.templateId);
                              if (!template) return null;

                              return (
                                <div
                                  key={active.templateId}
                                  className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-sm"
                                >
                                  <span className="font-medium">{template.label}</span>
                                  {template.kind === "number" && (
                                    <Input
                                      type="number"
                                      min="0"
                                      max={template.id === "disabledOpacity" ? "1" : undefined}
                                      step={template.id === "disabledOpacity" ? "0.1" : "1"}
                                      value={active.value as number}
                                      onChange={(e) =>
                                        handleUpdateConstraintValue(
                                          active.templateId,
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="w-16 h-6 text-xs"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  )}
                                  <button
                                    onClick={() => handleRemoveConstraint(active.templateId)}
                                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground py-4">
                          No constraints defined. All valid components are allowed.
                        </div>
                      )}

                      {/* Add constraint input */}
                      <div className="space-y-2">
                        <Label htmlFor="constraintSearch">Add constraint</Label>
                        <Input
                          id="constraintSearch"
                          type="text"
                          placeholder="Type to search constraints..."
                          value={constraintSearchInput}
                          onChange={(e) => setConstraintSearchInput(e.target.value)}
                        />
                        {/* Template suggestions - only show when user has typed something */}
                        {constraintSearchInput.trim().length > 0 && matchingTemplates.length > 0 && (
                          <div className="border rounded-md max-h-48 overflow-auto">
                            {matchingTemplates.map((template) => {
                              const isAdded = activeConstraints.some((ac) => ac.templateId === template.id);
                              return (
                                <button
                                  key={template.id}
                                  onClick={() => !isAdded && handleAddConstraint(template)}
                                  disabled={isAdded}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${
                                    isAdded ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                                  }`}
                                >
                                  <div className="font-medium">{template.label}</div>
                                  {template.description && (
                                    <div className="text-xs text-muted-foreground">{template.description}</div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Helper buttons */}
                      {activeConstraints.length > 0 && (
                        <div className="flex gap-2 pt-2">
                          <Button onClick={handleClearConstraints} variant="outline" className="flex-1">
                            Clear constraints
                          </Button>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Middle: Resolved Output Panel */}
        <div className="w-1/3 border-r border-border">
          <Card className="h-full rounded-none border-0">
            <CardHeader>
              <CardTitle>Resolved Output</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-5rem)]">
              <Tabs defaultValue="diff" className="h-full">
                <TabsList>
                  <TabsTrigger value="json">Resolved JSON</TabsTrigger>
                  <TabsTrigger value="diff">Diff</TabsTrigger>
                  <TabsTrigger value="errors">Errors</TabsTrigger>
                </TabsList>
                <TabsContent value="json" className="h-[calc(100%-3rem)] mt-4">
                  <ScrollArea className="h-full w-full rounded-md border border-border p-4">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                      {resolvedJson}
                    </pre>
                  </ScrollArea>
                </TabsContent>
                <TabsContent value="diff" className="h-[calc(100%-3rem)] mt-4">
                  <div className="flex flex-col gap-2">
                    <div className="border rounded-md overflow-hidden max-h-[60vh] overflow-y-auto">
                      {resolvedView && resolvedView.nodes.length > 0 ? (
                        <table className="w-full text-xs">
                          <thead className="bg-muted sticky top-0">
                            <tr>
                              <th className="text-left p-2 font-medium">Style Key</th>
                              <th className="text-left p-2 font-medium">Resolved Value</th>
                              <th className="text-left p-2 font-medium">Source</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resolvedView.nodes[0].trace.map((entry, index) => (
                              <tr key={index} className="border-t">
                                <td className="p-2 font-mono">{entry.key}</td>
                                <td className="p-2 font-mono">{String(entry.value)}</td>
                                <td className="p-2 text-muted-foreground">{entry.source}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4">
                          <p className="text-sm text-muted-foreground">No resolved node to diff.</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Active Constraints Table */}
                    {activeConstraints.length > 0 && (
                      <div className="border-t pt-2">
                        <p className="text-sm font-medium mb-3">Active Constraints</p>
                        <div className="border rounded-md overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-muted">
                              <tr>
                                <th className="text-left p-2 font-medium">Constraint</th>
                                <th className="text-left p-2 font-medium">Value</th>
                                <th className="text-left p-2 font-medium">Scope</th>
                                <th className="text-left p-2 font-medium">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activeConstraints.map((active) => {
                                const template = BUTTON_CONSTRAINT_TEMPLATES.find((t) => t.id === active.templateId);
                                if (!template) return null;
                                
                                const isViolated = errors.some((error) => 
                                  error.includes(`Constraint violation (${active.templateId})`)
                                );
                                
                                return (
                                  <tr key={active.templateId} className="border-t">
                                    <td className="p-2">{template.label}</td>
                                    <td className="p-2">
                                      {template.kind === "toggle" 
                                        ? (active.value ? "true" : "false")
                                        : String(active.value ?? template.defaultValue ?? "-")
                                      }
                                    </td>
                                    <td className="p-2">View</td>
                                    <td className="p-2">
                                      <span className={isViolated ? "text-destructive font-medium" : "text-muted-foreground"}>
                                        {isViolated ? "Violated" : "Active"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="errors" className="h-[calc(100%-3rem)] mt-4">
                  <ScrollArea className="h-full w-full rounded-md border border-border p-4">
                    {errors.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No errors</p>
                    ) : (
                      <ul className="space-y-2">
                        {errors.map((error, index) => (
                          <li key={index} className="text-sm text-destructive">
                            {error}
                          </li>
                        ))}
                      </ul>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right: Preview Panel */}
        <div className="w-1/3">
          <Card className="h-full rounded-none border-0">
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent className="h-[calc(100%-5rem)]">
              <ScrollArea className="h-full w-full rounded-md border border-border p-8">
                <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
                  {errors.length > 0 ? (
                    <div className="text-center space-y-3">
                      <p className="text-lg font-medium">
                        Design Model
                      </p>
                      <div className="space-y-2">
                        <ul className="text-sm text-destructive space-y-1 text-left max-w-md">
                          {errors.map((error, index) => (
                            <li key={index}>{error}</li>
                          ))}
                        </ul>
                        <Card className="mt-4 max-w-md mx-auto bg-muted/50 border-muted">
                          <CardContent>
                            <p className="text-sm font-medium mb-2">
                              💡Suggestions for AI
                            </p>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li>Downgrade extra button to secondary.</li>
                            </ul>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ) : resolvedView && resolvedView.nodes.length > 0 ? (
                    <div className="w-full space-y-2">
                      {resolvedView.nodes.map((node) => (
                        <div key={node.id} className="w-full">
                          <RenderedButton node={node} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center">
                      Preview canvas - component will render here
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="border-t border-border px-6 py-3 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Experiment by{" "}
          <a
            href="https://sherizan.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors underline"
          >
            sherizan
          </a>
        </p>
      </footer>
    </div>
  );
}
