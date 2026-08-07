"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createBankAccountAction, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

const initialState: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Adicionar conta"}
    </Button>
  );
}

export function NewBankAccountForm() {
  const [state, formAction] = useFormState(createBankAccountAction, initialState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={formAction} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="ba-name">Nome de exibição</Label>
          <Input id="ba-name" name="display_name" placeholder="Ex.: C6 – DECK" required />
        </div>
        <div>
          <Label htmlFor="ba-bank">Banco</Label>
          <Input id="ba-bank" name="bank_name" placeholder="Ex.: C6 Bank" />
        </div>
        <div>
          <Label htmlFor="ba-ownership">Titularidade</Label>
          <Select id="ba-ownership" name="ownership" defaultValue="deck03" required>
            <option value="deck03">DECK 03 (empresarial)</option>
            <option value="pessoa_fisica">Pessoa física</option>
            <option value="outro">Outro</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="ba-type">Tipo</Label>
          <Select id="ba-type" name="account_type" defaultValue="conta_corrente" required>
            <option value="conta_corrente">Conta corrente</option>
            <option value="conta_pagamento">Conta de pagamento</option>
            <option value="poupanca">Poupança</option>
            <option value="caixa">Caixa</option>
            <option value="investimento_liquidez">Investimento com liquidez</option>
            <option value="outro">Outro</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="ba-agency">Agência (opcional)</Label>
          <Input id="ba-agency" name="agency" />
        </div>
        <div>
          <Label htmlFor="ba-account">Conta (opcional)</Label>
          <Input id="ba-account" name="account_number" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="ba-bank-code">Código do banco (opcional)</Label>
          <Input id="ba-bank-code" name="bank_code" placeholder="Ex.: 341" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="ba-pix">Chave Pix (opcional)</Label>
          <Input id="ba-pix" name="pix_key" placeholder="Usada nos recibos de aluguel" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <Label htmlFor="ba-balance">Saldo inicial</Label>
          <Input id="ba-balance" name="initial_balance" type="number" step="0.01" defaultValue="0" />
        </div>
        <div>
          <Label htmlFor="ba-balance-date">Data do saldo inicial</Label>
          <Input id="ba-balance-date" name="initial_balance_date" type="date" defaultValue={today} required />
        </div>
        <div>
          <Label htmlFor="ba-min-balance">Saldo mínimo (opcional)</Label>
          <Input id="ba-min-balance" name="minimum_balance" type="number" step="0.01" />
        </div>
        <div>
          <Label htmlFor="ba-holder">Titular (opcional)</Label>
          <Input id="ba-holder" name="holder_name" />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 pt-1">
        <label className="flex items-center gap-2 text-sm text-ink">
          <Checkbox name="consider_in_available_balance" defaultChecked />
          Considerar no saldo disponível
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <Checkbox name="consider_in_business_dashboard" defaultChecked />
          Considerar no dashboard empresarial
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <Checkbox name="allow_ofx_import" />
          Permitir importação OFX
        </label>
      </div>

      {state.error && (
        <p className="rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">
          {state.error}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
