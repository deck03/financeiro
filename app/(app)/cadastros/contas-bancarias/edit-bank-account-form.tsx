"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateBankAccountAction, deleteBankAccountAction, type FormState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteButton } from "@/components/cadastros/delete-button";

const initialState: FormState = {};

type Account = {
  id: string;
  display_name: string;
  bank_name: string | null;
  agency: string | null;
  account_number: string | null;
  bank_code: string | null;
  pix_key: string | null;
  account_type: string;
  ownership: string;
  holder_name: string | null;
  document_number: string | null;
  initial_balance: number;
  initial_balance_date: string;
  minimum_balance: number | null;
  consider_in_available_balance: boolean;
  consider_in_business_dashboard: boolean;
  allow_ofx_import: boolean;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar alterações"}
    </Button>
  );
}

export function EditBankAccountForm({ account: a }: { account: Account }) {
  const [state, formAction] = useFormState(updateBankAccountAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={a.id} />
      {/* Campos ocultos exigidos pelo mesmo schema da criação — o saldo
          inicial não é editado por este formulário (tem o próprio, acima). */}
      <input type="hidden" name="initial_balance" value={a.initial_balance} />
      <input type="hidden" name="initial_balance_date" value={a.initial_balance_date} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="eba-name">Nome de exibição</Label>
          <Input id="eba-name" name="display_name" defaultValue={a.display_name} required />
        </div>
        <div>
          <Label htmlFor="eba-bank">Banco</Label>
          <Input id="eba-bank" name="bank_name" defaultValue={a.bank_name ?? ""} />
        </div>
        <div>
          <Label htmlFor="eba-ownership">Titularidade</Label>
          <Select id="eba-ownership" name="ownership" defaultValue={a.ownership} required>
            <option value="deck03">DECK 03 (empresarial)</option>
            <option value="pessoa_fisica">Pessoa física</option>
            <option value="outro">Outro</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="eba-type">Tipo</Label>
          <Select id="eba-type" name="account_type" defaultValue={a.account_type} required>
            <option value="conta_corrente">Conta corrente</option>
            <option value="conta_pagamento">Conta de pagamento</option>
            <option value="poupanca">Poupança</option>
            <option value="caixa">Caixa</option>
            <option value="investimento_liquidez">Investimento com liquidez</option>
            <option value="outro">Outro</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="eba-agency">Agência</Label>
          <Input id="eba-agency" name="agency" defaultValue={a.agency ?? ""} />
        </div>
        <div>
          <Label htmlFor="eba-account">Conta</Label>
          <Input id="eba-account" name="account_number" defaultValue={a.account_number ?? ""} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="eba-bank-code">Código do banco</Label>
          <Input id="eba-bank-code" name="bank_code" defaultValue={a.bank_code ?? ""} placeholder="Ex.: 341" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="eba-pix">Chave Pix</Label>
          <Input id="eba-pix" name="pix_key" defaultValue={a.pix_key ?? ""} placeholder="Usada nos recibos de aluguel" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="eba-min-balance">Saldo mínimo</Label>
          <Input id="eba-min-balance" name="minimum_balance" type="number" step="0.01" defaultValue={a.minimum_balance ?? ""} />
        </div>
        <div>
          <Label htmlFor="eba-holder">Titular</Label>
          <Input id="eba-holder" name="holder_name" defaultValue={a.holder_name ?? ""} />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 pt-1">
        <label className="flex items-center gap-2 text-sm text-ink">
          <Checkbox name="consider_in_available_balance" defaultChecked={a.consider_in_available_balance} />
          Considerar no saldo disponível
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <Checkbox name="consider_in_business_dashboard" defaultChecked={a.consider_in_business_dashboard} />
          Considerar no dashboard empresarial
        </label>
        <label className="flex items-center gap-2 text-sm text-ink">
          <Checkbox name="allow_ofx_import" defaultChecked={a.allow_ofx_import} />
          Permitir importação OFX
        </label>
      </div>

      {state.error && (
        <p className="rounded-card bg-signal-negativeSoft px-3 py-2 text-sm text-signal-negative">{state.error}</p>
      )}
      {state.success && <p className="text-sm text-signal-positive">Alterações salvas.</p>}

      <div className="flex items-center justify-between">
        <SubmitButton />
        <DeleteButton action={deleteBankAccountAction.bind(null, a.id)} itemLabel={a.display_name} />
      </div>
    </form>
  );
}
