"use client";

import { useFormState, useFormStatus } from "react-dom";
import { saveReportConfigAction, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const initialState: FormState = {};

const WEEKDAYS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar configuração"}
    </Button>
  );
}

export function ReportConfigForm({
  reportType,
  config,
}: {
  reportType: "semanal" | "mensal";
  config: {
    enabled: boolean;
    recipients: string[];
    day_of_week: number | null;
    day_of_month: number | null;
    send_hour: number;
  } | null;
}) {
  const [state, formAction] = useFormState(saveReportConfigAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="report_type" value={reportType} />

      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <Checkbox name="enabled" defaultChecked={config?.enabled ?? false} />
        Ativar envio automático
      </label>

      <div>
        <Label htmlFor={`recipients-${reportType}`}>Destinatários (um por linha, ou separados por vírgula)</Label>
        <textarea
          id={`recipients-${reportType}`}
          name="recipients"
          rows={3}
          defaultValue={(config?.recipients ?? []).join("\n")}
          className="w-full rounded-card border border-base-border bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
          placeholder="ceo@deck03.com&#10;financeiro@deck03.com"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {reportType === "semanal" ? (
          <div>
            <Label htmlFor={`dow-${reportType}`}>Dia da semana</Label>
            <Select id={`dow-${reportType}`} name="day_of_week" defaultValue={config?.day_of_week ?? 1}>
              {WEEKDAYS.map((label, i) => (
                <option key={i} value={i}>
                  {label}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <div>
            <Label htmlFor={`dom-${reportType}`}>Dia do mês</Label>
            <Input
              id={`dom-${reportType}`}
              name="day_of_month"
              type="number"
              min="1"
              max="28"
              defaultValue={config?.day_of_month ?? 1}
            />
            <p className="mt-1 text-xs text-ink-faint">Use até 28 para funcionar em qualquer mês.</p>
          </div>
        )}
        <div>
          <Label htmlFor={`hour-${reportType}`}>Horário desejado</Label>
          <Input id={`hour-${reportType}`} name="send_hour" type="number" min="0" max="23" defaultValue={config?.send_hour ?? 8} />
          <p className="mt-1 text-xs text-ink-faint">
            No plano gratuito da Vercel, o envio real acontece uma vez por dia, por volta das 8h
            (horário de Brasília) — o horário aqui fica registrado, mas a precisão de hora exata
            depende do plano.
          </p>
        </div>
      </div>

      {state.error && (
        <p className="rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">{state.error}</p>
      )}
      {state.success && (
        <p className="rounded-card bg-signal-positiveSoft px-3 py-2 text-sm text-signal-positive">Configuração salva.</p>
      )}

      <SubmitButton />
    </form>
  );
}
