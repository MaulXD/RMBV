"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "./ui/Icon";
import { useSession } from "./SessionProvider";
import { useToast } from "./ToastProvider";

type OfficeLocation = {
  teamName: string;
  officeLatitude: number | null;
  officeLongitude: number | null;
  defaultGpsRadiusMeters: number;
  configured: boolean;
  canConfigure: boolean;
};

export function TeamOfficeLocationPanel({ teamId }: { teamId: string }) {
  const { user } = useSession();
  const toast = useToast();
  const [data, setData] = useState<OfficeLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState("200");

  const teamParam = user?.role === "ADMIN" ? `?teamId=${teamId}` : "";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/equipe/office-location${teamParam}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar");
      setData(json);
      setLat(json.officeLatitude != null ? String(json.officeLatitude) : "");
      setLng(json.officeLongitude != null ? String(json.officeLongitude) : "");
      setRadius(String(json.defaultGpsRadiusMeters ?? 200));
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao carregar localização", "error");
    } finally {
      setLoading(false);
    }
  }, [teamParam, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    if (!data?.canConfigure) return;

    const officeLatitude = lat.trim() ? Number(lat) : null;
    const officeLongitude = lng.trim() ? Number(lng) : null;
    const defaultGpsRadiusMeters = Number(radius);

    if (Number.isNaN(defaultGpsRadiusMeters) || defaultGpsRadiusMeters < 50 || defaultGpsRadiusMeters > 5000) {
      toast("Raio deve ser entre 50 e 5000 metros", "error");
      return;
    }

    if ((officeLatitude == null) !== (officeLongitude == null)) {
      toast("Preencha latitude e longitude, ou deixe ambos vazios", "error");
      return;
    }

    if (officeLatitude != null && (Number.isNaN(officeLatitude) || Number.isNaN(officeLongitude!))) {
      toast("Coordenadas inválidas", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/equipe/office-location${teamParam}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officeLatitude,
          officeLongitude,
          defaultGpsRadiusMeters,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha ao salvar");
      setData(json);
      toast("Localização do escritório salva", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Erro ao salvar", "error");
    } finally {
      setSaving(false);
    }
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast("GPS indisponível neste dispositivo", "error");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
        toast("Coordenadas preenchidas com sua localização atual", "success");
      },
      (err) => {
        setLocating(false);
        toast(
          err.code === 1
            ? "Permissão de localização negada"
            : "Não foi possível obter a localização",
          "error",
        );
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }

  function clearLocation() {
    setLat("");
    setLng("");
  }

  if (loading) {
    return <p className="text-sm text-muted">Carregando localização do escritório...</p>;
  }

  if (!data) return null;

  return (
    <div className="panel-solid space-y-4 p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
          <Icon name="building" className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">Localização do escritório (GPS)</h3>
          <p className="mt-1 text-xs text-muted leading-relaxed">
            Define o ponto de referência para colaboradores com{" "}
            <strong className="text-foreground">GPS obrigatório</strong> no ponto mobile.
            Ative o GPS por membro em <strong className="text-foreground">Membros</strong>.
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
            data.configured
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-500/15 text-amber-800 dark:text-amber-200"
          }`}
        >
          {data.configured ? "Configurado" : "Pendente"}
        </span>
      </div>

      {data.canConfigure ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="form-label">Latitude</label>
              <input
                type="text"
                inputMode="decimal"
                className="industrial-input w-full"
                placeholder="-23.550520"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Longitude</label>
              <input
                type="text"
                inputMode="decimal"
                className="industrial-input w-full"
                placeholder="-46.633308"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label">Raio permitido (metros)</label>
            <input
              type="number"
              min={50}
              max={5000}
              step={10}
              className="industrial-input w-full max-w-xs"
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-muted">
              Colaborador só registra ponto mobile dentro deste raio do escritório (50–5000 m).
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ghost text-xs"
              disabled={locating}
              onClick={useCurrentLocation}
            >
              <Icon name="building" className="h-3.5 w-3.5" />
              {locating ? "Obtendo GPS..." : "Usar minha localização"}
            </button>
            <button type="button" className="btn-ghost text-xs" onClick={clearLocation}>
              Limpar coordenadas
            </button>
            <button
              type="button"
              className="btn-primary text-xs sm:ml-auto"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "Salvando..." : "Salvar localização"}
            </button>
          </div>
        </>
      ) : (
        <p className="text-xs text-muted">
          {data.configured
            ? `Escritório configurado · raio ${data.defaultGpsRadiusMeters} m`
            : "Localização ainda não configurada pelo ADV."}
        </p>
      )}

      {!data.configured && data.canConfigure && (
        <p className="alert alert-warn text-xs">
          Sem coordenadas, colaboradores com GPS obrigatório não conseguirão bater ponto pelo celular.
        </p>
      )}
    </div>
  );
}
