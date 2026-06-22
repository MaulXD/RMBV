/** Enquadramento compartilhado — cadastro, ponto e quiosque. */

export const FACE_VIDEO_ZOOM = 1.62;
export const FACE_VIDEO_ORIGIN = "center 36%";

export const faceVideoStyle = {
  transform: `scaleX(-1) scale(${FACE_VIDEO_ZOOM})`,
  transformOrigin: FACE_VIDEO_ORIGIN,
} as const;

/** Inset no container da câmera — oval grande e estável (evita % height em flex). */
export const FACE_OVAL_INSET = {
  top: "2%",
  right: "5%",
  bottom: "2%",
  left: "5%",
} as const;

export const FACE_OVAL_BORDER_CLASS = "border-[3px] border-dashed";
