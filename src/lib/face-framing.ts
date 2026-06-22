/** Enquadramento compartilhado — cadastro, ponto e quiosque. */

export const FACE_VIDEO_ZOOM = 1.62;
export const FACE_VIDEO_ORIGIN = "center 36%";

export const faceVideoStyle = {
  transform: `scaleX(-1) scale(${FACE_VIDEO_ZOOM})`,
  transformOrigin: FACE_VIDEO_ORIGIN,
} as const;

/** Oval centralizado — 51% da largura e altura do preview. */
const FACE_OVAL_SIZE_PERCENT = 51;
const FACE_OVAL_MARGIN = `${(100 - FACE_OVAL_SIZE_PERCENT) / 2}%`;

export const FACE_OVAL_INSET = {
  top: FACE_OVAL_MARGIN,
  right: FACE_OVAL_MARGIN,
  bottom: FACE_OVAL_MARGIN,
  left: FACE_OVAL_MARGIN,
} as const;

export const FACE_OVAL_BORDER_CLASS = "border-[3px] border-dashed";
