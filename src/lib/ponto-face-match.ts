import { findBestFaceMatch } from "@/lib/face-match";
import { parseStoredFaceDescriptor } from "@/lib/face-verify";

export type TeamFaceCandidate = {
  id: string;
  name: string;
  descriptor: Float32Array;
};

export function teamUsersToFaceCandidates(
  users: Array<{ id: string; name: string; faceDescriptor: unknown }>,
): TeamFaceCandidate[] {
  const out: TeamFaceCandidate[] = [];
  for (const user of users) {
    const arr = parseStoredFaceDescriptor(user.faceDescriptor);
    if (!arr) continue;
    out.push({
      id: user.id,
      name: user.name,
      descriptor: new Float32Array(arr),
    });
  }
  return out;
}

export function matchProbeAgainstTeam(
  probe: number[],
  candidates: TeamFaceCandidate[],
) {
  const probeArr = new Float32Array(probe);
  return findBestFaceMatch(probeArr, candidates);
}
