import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Clock, XCircle } from "lucide-react";
import { AcceptInvitationForm } from "@/components/invite/accept-invitation-form";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

interface PageProps {
  searchParams: Promise<{ token?: string }>;
}

async function getInvitation(token: string) {
  const tokenHash = hashToken(token);

  const invitation = await db.query.invitations.findFirst({
    where: eq(schema.invitations.tokenHash, tokenHash),
  });

  return invitation;
}

export default async function AcceptInvitationPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = params.token;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-red/10 mx-auto mb-4">
                <AlertCircle className="h-6 w-6 text-accent-red" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Invalid Link</h3>
              <p className="text-sm text-foreground-muted">
                This invitation link is missing a token. Please request a new
                invitation from your administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const invitation = await getInvitation(token);

  if (!invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-red/10 mx-auto mb-4">
                <XCircle className="h-6 w-6 text-accent-red" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Invalid Invitation</h3>
              <p className="text-sm text-foreground-muted">
                This invitation link is invalid or has been revoked. Please
                request a new invitation from your administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if already accepted
  if (invitation.status === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-yellow/10 mx-auto mb-4">
                <AlertCircle className="h-6 w-6 text-accent-yellow" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Already Accepted</h3>
              <p className="text-sm text-foreground-muted">
                This invitation has already been accepted. If you need help
                accessing your account, contact your administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if revoked
  if (invitation.status === "revoked") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-red/10 mx-auto mb-4">
                <XCircle className="h-6 w-6 text-accent-red" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Invitation Revoked</h3>
              <p className="text-sm text-foreground-muted">
                This invitation has been revoked. Please request a new
                invitation from your administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if expired
  if (invitation.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-yellow/10 mx-auto mb-4">
                <Clock className="h-6 w-6 text-accent-yellow" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Invitation Expired</h3>
              <p className="text-sm text-foreground-muted">
                This invitation has expired. Please request a new invitation
                from your administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <AcceptInvitationForm
        token={token}
        invitation={{
          email: invitation.email,
          role: invitation.role as "admin" | "developer" | "viewer",
          engineerLevel: invitation.engineerLevel as
            | "junior"
            | "mid"
            | "senior"
            | "staff"
            | "principal",
          expiresAt: invitation.expiresAt,
        }}
      />
    </div>
  );
}
