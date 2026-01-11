"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Check, Loader2 } from "lucide-react";

interface ProfileFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    engineerLevel: string;
    teamId: string | null;
  };
  teams: Array<{ id: string; name: string }>;
}

const engineerLevels = [
  { value: "junior", label: "Junior Engineer" },
  { value: "mid", label: "Mid-Level Engineer" },
  { value: "senior", label: "Senior Engineer" },
  { value: "staff", label: "Staff Engineer" },
  { value: "principal", label: "Principal Engineer" },
];

const roles = [
  { value: "admin", label: "Admin" },
  { value: "developer", label: "Developer" },
  { value: "viewer", label: "Viewer" },
];

export function ProfileForm({ user, teams }: ProfileFormProps) {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    engineerLevel: user.engineerLevel,
    teamId: user.teamId || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      const response = await fetch(`/api/v1/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
              />
            </div>

            {/* Team */}
            <div>
              <label htmlFor="team" className="block text-sm font-medium mb-2">
                Team
              </label>
              <select
                id="team"
                value={formData.teamId}
                onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
              >
                <option value="">No Team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Engineer Level */}
            <div>
              <label htmlFor="level" className="block text-sm font-medium mb-2">
                Engineer Level
              </label>
              <select
                id="level"
                value={formData.engineerLevel}
                onChange={(e) => setFormData({ ...formData, engineerLevel: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
              >
                {engineerLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-foreground-muted">
                Used for ROI calculations based on your hourly rate
              </p>
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium mb-2">
                Role
              </label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-accent-cyan focus:outline-none focus:ring-1 focus:ring-accent-cyan"
              >
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-4">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-accent-cyan px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-cyan/90 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
              {saved && (
                <span className="flex items-center gap-1 text-sm text-accent-green">
                  <Check className="h-4 w-4" />
                  Saved successfully
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
