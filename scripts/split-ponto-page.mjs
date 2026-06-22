import fs from "fs";

const path = "src/app/(app)/ponto/page.tsx";
const lines = fs.readFileSync(path, "utf8").split(/\r?\n/);

const selfImports = `"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SessionUser } from "@/components/SessionProvider";
import { Icon } from "@/components/ui/Icon";
import { MultiCaptureFaceWizard } from "@/components/MultiCaptureFaceWizard";
import { LivenessCornerBanner } from "@/components/LivenessCornerBanner";
import { useLivenessAudioFeedback } from "@/hooks/useLivenessAudioFeedback";
import { warmupLivenessAudio, getLivenessPassedDelayMs } from "@/lib/face-liveness-audio";
import { LivenessEyeGuide } from "@/components/LivenessEyeGuide";
import {
  faceVideoStyle,
  FACE_OVAL_BORDER_CLASS,
  FACE_OVAL_INSET,
} from "@/lib/face-framing";
import { hoursSummary, nextPontoType, pontoTypeLabel } from "@/lib/ponto-hours";
import {
  isFaceMatch,
  toDescriptorArray,
  euclideanDistance as euclidean,
  FACE_RECOGNITION_DETECT,
  FACE_MATCH_STABLE_FRAMES,
  createMatchFrameTracker,
  resetMatchFrameTracker,
  tickStrongMatchFrame,
  tickNoFaceMatchFrame,
  type MatchFrameTracker,
} from "@/lib/face-match";
import { formatGpsPontoError, geolocationErrorMessage } from "@/lib/gps-ponto";
import {
  createLivenessTracker,
  resetLivenessTracker,
  tickLiveness,
  type LivenessTracker,
  type LivenessPhase,
  LIVENESS_POLL_MS,
  LIVENESS_FACE_DETECT,
  isVideoReadyForDetection,
  waitForVideoReady,
} from "@/lib/face-liveness";
import { loadFaceModels } from "@/lib/face-models";
import { fmtPontoTime, type PontoRecord, type PontoType, type ClockPhase } from "@/lib/ponto-types";

`;

const adminImports = `"use client";

import { useCallback, useEffect, useState } from "react";
import type { SessionUser } from "@/components/SessionProvider";
import { Icon } from "@/components/ui/Icon";
import { TeamFaceEnrollmentPanel } from "@/components/TeamFaceEnrollmentPanel";
import { pontoTypeLabel } from "@/lib/ponto-hours";
import { type PontoRecord } from "@/lib/ponto-types";

`;

const selfBody = lines
  .slice(90, 878)
  .join("\n")
  .replace(/^function SelfServicePonto/, "export function SelfServicePonto")
  .replace(/loadModels\(\)/g, "loadFaceModels()")
  .replace(/fmtTime\(/g, "fmtPontoTime(");

const adminBody = lines
  .slice(880, 1054)
  .join("\n")
  .replace(/^function AdminPontoView/, "export function AdminPontoView");

fs.mkdirSync("src/components/ponto", { recursive: true });
fs.writeFileSync("src/components/ponto/SelfServicePonto.tsx", selfImports + selfBody + "\n");
fs.writeFileSync("src/components/ponto/AdminPontoView.tsx", adminImports + adminBody + "\n");

const pageContent = `"use client";

import { useState } from "react";
import { useSession } from "@/components/SessionProvider";
import { SelfServicePonto } from "@/components/ponto/SelfServicePonto";
import { AdminPontoView } from "@/components/ponto/AdminPontoView";

export default function PontoPage() {
  const { user } = useSession();
  const [mobileTab, setMobileTab] = useState<"mine" | "team">("mine");
  if (!user) return null;

  const canSelfPunch = user.role !== "ADMIN";
  const canManageTeam = user.role === "ADMIN" || user.role === "ADV" || user.role === "GERENTE";

  if (!canSelfPunch) return <AdminPontoView user={user} />;

  if (canManageTeam) {
    return (
      <>
        <div className="app-tabs lg:hidden">
          <button
            type="button"
            className={\`app-tab \${mobileTab === "mine" ? "app-tab-active" : ""}\`}
            onClick={() => setMobileTab("mine")}
          >
            Meu ponto
          </button>
          <button
            type="button"
            className={\`app-tab \${mobileTab === "team" ? "app-tab-active" : ""}\`}
            onClick={() => setMobileTab("team")}
          >
            Equipe
          </button>
        </div>
        <div className="lg:hidden">
          {mobileTab === "mine" ? (
            <SelfServicePonto user={user} />
          ) : (
            <AdminPontoView user={user} embedded />
          )}
        </div>
        <div className="hidden space-y-8 lg:block">
          <SelfServicePonto user={user} />
          <AdminPontoView user={user} embedded />
        </div>
      </>
    );
  }

  return <SelfServicePonto user={user} />;
}
`;

fs.writeFileSync(path, pageContent);
console.log("Split ponto page OK");
