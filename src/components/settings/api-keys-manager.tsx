"use client";

import { useState } from "react";
import { Key, Plus, Copy, Check, Trash2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  isActive: boolean;
}

interface ApiKeysManagerProps {
  initialKeys: ApiKey[];
  userId: string;
}

export function ApiKeysManager({ initialKeys, userId }: ApiKeysManagerProps) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [showCreate, setShowCreate] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);

    try {
      const response = await fetch("/api/v1/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, name: newKeyName }),
      });

      const data = await response.json();
      if (data.success) {
        setNewKey(data.key);
        setKeys([
          {
            id: data.id,
            name: newKeyName,
            keyPrefix: data.keyPrefix,
            createdAt: new Date(),
            lastUsedAt: null,
            isActive: true,
          },
          ...keys,
        ]);
        setNewKeyName("");
      }
    } catch (error) {
      console.error("Failed to create API key:", error);
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/v1/api-keys/${keyId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setKeys(keys.filter((k) => k.id !== keyId));
      }
    } catch (error) {
      console.error("Failed to revoke API key:", error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeNewKeyModal = () => {
    setNewKey(null);
    setShowCreate(false);
  };

  return (
    <div className="space-y-6">
      {/* New Key Modal */}
      {newKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg mx-4 bg-background-card border border-border rounded-xl shadow-xl">
            <div className="p-5 border-b border-border">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <Key className="h-5 w-5 text-accent-cyan" />
                API Key Created
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-lg bg-accent-yellow/10 border border-accent-yellow/20 p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-accent-yellow shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-accent-yellow">Save this key now!</p>
                    <p className="text-foreground-secondary mt-1">
                      This is the only time you&apos;ll see this key. Store it securely.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="settings-label">Your API Key</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-lg bg-background-secondary border border-border px-4 py-3 font-mono text-sm break-all">
                    {newKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(newKey)}
                    className="flex h-11 w-11 items-center justify-center rounded-lg border border-border hover:bg-background-secondary transition-colors"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-accent-green" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={closeNewKeyModal}
                className="w-full settings-button"
              >
                I&apos;ve Saved My Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="settings-section-title mb-1">API Keys</h2>
          <p className="text-sm text-foreground-muted">
            Manage API keys for tool integrations
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="settings-button flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Key
        </button>
      </div>

      {/* Create Key Form */}
      {showCreate && !newKey && (
        <div className="bg-background-secondary border border-border rounded-lg p-4">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="keyName" className="settings-label">
                Key Name
              </label>
              <input
                type="text"
                id="keyName"
                placeholder="e.g., Claude Code - MacBook Pro"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="settings-input"
              />
            </div>
            <button
              onClick={createKey}
              disabled={!newKeyName.trim() || creating}
              className="settings-button"
            >
              {creating ? "Creating..." : "Create"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="settings-button-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keys List */}
      <div className="settings-section">
        <h3 className="settings-section-title">Your API Keys</h3>
        {keys.length === 0 ? (
          <div className="text-center py-8 text-foreground-muted">
            <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No API keys yet</p>
            <p className="text-sm mt-1">Create a key to start integrating your tools</p>
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <div
                key={key.id}
                className={cn(
                  "flex items-center justify-between rounded-lg border border-border bg-background-secondary p-4",
                  !key.isActive && "opacity-50"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-cyan/10">
                    <Key className="h-5 w-5 text-accent-cyan" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{key.name}</p>
                    <div className="flex items-center gap-3 text-sm text-foreground-muted">
                      <code className="rounded bg-background px-2 py-0.5 text-xs">
                        {key.keyPrefix}...
                      </code>
                      <span>
                        Created {new Date(key.createdAt).toLocaleDateString()}
                      </span>
                      {key.lastUsedAt && (
                        <span>
                          Last used {new Date(key.lastUsedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => revokeKey(key.id)}
                  className="flex items-center gap-2 rounded-lg border border-accent-red/20 px-3 py-1.5 text-sm text-accent-red hover:bg-accent-red/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage Instructions */}
      <div>
        <h3 className="settings-section-title">Using Your API Key</h3>
        <p className="text-sm text-foreground-muted mb-3">
          Include your API key in requests to the dashboard API:
        </p>
        <div className="rounded-lg bg-background-secondary border border-border p-4 overflow-x-auto">
          <code className="text-sm whitespace-pre">
            <span className="text-accent-purple">curl</span>{" "}
            <span className="text-accent-cyan">-X POST</span>{" "}
            <span className="text-foreground-secondary">http://localhost:3000/api/v1/ingest</span>{" "}
            <span className="text-accent-yellow">\</span>
            {"\n"}
            {"  "}<span className="text-accent-cyan">-H</span>{" "}
            <span className="text-accent-green">&quot;X-API-Key: your-api-key&quot;</span>{" "}
            <span className="text-accent-yellow">\</span>
            {"\n"}
            {"  "}<span className="text-accent-cyan">-H</span>{" "}
            <span className="text-accent-green">&quot;Content-Type: application/json&quot;</span>{" "}
            <span className="text-accent-yellow">\</span>
            {"\n"}
            {"  "}<span className="text-accent-cyan">-d</span>{" "}
            <span className="text-accent-green">&apos;&#123;&quot;event&quot;: &quot;session_start&quot;, ...&#125;&apos;</span>
          </code>
        </div>
        <p className="text-sm text-foreground-muted mt-3">
          See the <a href="/settings/integrations" className="text-accent-cyan hover:underline">Integrations</a> page for tool-specific setup guides.
        </p>
      </div>
    </div>
  );
}
