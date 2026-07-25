import crypto from "node:crypto";

import type {
  CheckOutcome,
  IdentityProvider,
  VerificationDecision,
  VerificationSession,
} from "./types";

/**
 * Persona identity verification.
 *
 * MOCKED unless PERSONA_API_KEY and PERSONA_TEMPLATE_ID are set. When mocked,
 * no network call is made and a deterministic fake decision is returned so
 * the full review workflow can be exercised end to end.
 *
 * Require a vendor with iBeta / ISO 30107-3 Level 2 presentation-attack
 * detection before going live — passive-only liveness is defeatable by
 * replay and injection attacks.
 */

const API_BASE = "https://api.withpersona.com/api/v1";

function credentials() {
  const apiKey = process.env.PERSONA_API_KEY;
  const templateId = process.env.PERSONA_TEMPLATE_ID;
  if (!apiKey || !templateId) return null;
  return { apiKey, templateId };
}

/** Maps Persona's per-check status strings onto our tri-state outcome. */
function toOutcome(status: string | undefined): CheckOutcome {
  if (status === "passed") return "PASS";
  if (status === "failed") return "FAIL";
  return "UNAVAILABLE";
}

type PersonaCheck = { name?: string; status?: string };

export const personaProvider: IdentityProvider = {
  key: "PERSONA",
  label: "Persona",

  isMocked() {
    return credentials() === null;
  },

  async createSession({ userId, email, returnUrl }): Promise<VerificationSession> {
    const creds = credentials();
    const expiresAt = new Date(Date.now() + 60 * 60_000);

    if (!creds) {
      const sessionId = `mock_inq_${crypto.randomBytes(8).toString("hex")}`;
      console.warn(
        `[identity:persona:mock] No PERSONA_API_KEY — simulating verification session ` +
          `${sessionId} for user ${userId}`
      );
      return {
        sessionId,
        // Routes to our own simulator screen rather than a vendor origin.
        redirectUrl: `/trainer/verification/simulate?session=${sessionId}`,
        expiresAt,
        mocked: true,
      };
    }

    const res = await fetch(`${API_BASE}/inquiries`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.apiKey}`,
        "Content-Type": "application/json",
        "Persona-Version": "2023-01-05",
      },
      body: JSON.stringify({
        data: {
          attributes: {
            "inquiry-template-id": creds.templateId,
            "reference-id": userId,
            fields: { email_address: email },
            "redirect-uri": returnUrl,
          },
        },
      }),
    });

    if (!res.ok) throw new Error(`Persona inquiry creation failed (${res.status})`);

    const json = (await res.json()) as {
      data?: { id?: string; attributes?: { "session-token"?: string } };
    };
    const inquiryId = json.data?.id;
    if (!inquiryId) throw new Error("Persona response missing inquiry id");

    return {
      sessionId: inquiryId,
      redirectUrl: `https://withpersona.com/verify?inquiry-id=${inquiryId}`,
      expiresAt,
      mocked: false,
    };
  },

  async getDecision(sessionId: string): Promise<VerificationDecision> {
    const creds = credentials();

    if (!creds) {
      // Deterministic from the session id so a given mock session always
      // yields the same outcome across polls.
      const approved = !sessionId.endsWith("f");
      return {
        sessionId,
        status: approved ? "VERIFIED" : "NEEDS_REVIEW",
        documentType: "PASSPORT",
        documentCountry: "KE",
        documentAuthentic: approved ? "PASS" : "UNAVAILABLE",
        livenessPassed: approved ? "PASS" : "FAIL",
        faceMatchPassed: approved ? "PASS" : "UNAVAILABLE",
        faceMatchScore: approved ? 0.94 : 0.42,
        duplicateCheckPassed: "PASS",
        reason: approved ? undefined : "Simulated liveness failure — routed to manual review.",
        mocked: true,
      };
    }

    const res = await fetch(`${API_BASE}/inquiries/${sessionId}`, {
      headers: { Authorization: `Bearer ${creds.apiKey}`, "Persona-Version": "2023-01-05" },
    });
    if (!res.ok) throw new Error(`Persona inquiry fetch failed (${res.status})`);

    const json = (await res.json()) as {
      data?: {
        attributes?: {
          status?: string;
          checks?: PersonaCheck[];
          fields?: {
            "identification-class"?: { value?: string };
            "address-country-code"?: { value?: string };
          };
        };
      };
    };

    const attrs = json.data?.attributes;
    const checks = attrs?.checks ?? [];
    const check = (name: string) => checks.find((c) => c.name === name)?.status;

    const status =
      attrs?.status === "approved"
        ? "VERIFIED"
        : attrs?.status === "declined"
          ? "REJECTED"
          : attrs?.status === "needs_review"
            ? "NEEDS_REVIEW"
            : "PENDING";

    return {
      sessionId,
      status,
      documentType: attrs?.fields?.["identification-class"]?.value,
      documentCountry: attrs?.fields?.["address-country-code"]?.value,
      documentAuthentic: toOutcome(check("id_tampering_detection")),
      livenessPassed: toOutcome(check("selfie_liveness_detection")),
      faceMatchPassed: toOutcome(check("selfie_id_comparison")),
      duplicateCheckPassed: toOutcome(check("duplicate_account_detection")),
      mocked: false,
    };
  },
};
