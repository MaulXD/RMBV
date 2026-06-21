/** Distância em metros entre dois pontos (fórmula de Haversine). */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isOfficeGpsConfigured(
  lat: number | null | undefined,
  lng: number | null | undefined,
): boolean {
  return lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
}

export function formatGpsPontoError(message: string): string {
  if (message.includes("Fora do raio")) {
    return `${message}. Aproxime-se do escritório ou use o quiosque no local.`;
  }
  if (message.includes("sem coordenadas GPS")) {
    return "Localização do escritório ainda não foi configurada pelo gestor. Solicite ao ADV ou use o quiosque no escritório.";
  }
  if (message.includes("Localização GPS obrigatória")) {
    return "Ative a localização do celular nas configurações do navegador e tente novamente.";
  }
  return message;
}

export function geolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return "Permissão de localização negada. Ative nas configurações do navegador.";
    case 2:
      return "Localização indisponível no momento. Tente ao ar livre ou mais perto de uma janela.";
    case 3:
      return "Tempo esgotado ao obter GPS. Verifique se a localização está ativa e tente de novo.";
    default:
      return "Não foi possível obter sua localização.";
  }
}
