import { z } from "zod";

export const chartFamilySchema = z.object({
  name: z.string().min(1, "Informe o nome da família."),
  code: z.string().optional().or(z.literal("")),
  type: z.enum(["receita", "despesa", "transferencia"], {
    errorMap: () => ({ message: "Selecione o tipo." }),
  }),
});

export const chartCategorySchema = z.object({
  family_id: z.string().uuid("Selecione a família."),
  name: z.string().min(1, "Informe o nome da categoria."),
  code: z.string().optional().or(z.literal("")),
  managerial_nature: z.enum([
    "operacional",
    "financeira",
    "investimento",
    "financiamento",
    "movimentacao_socios",
    "pessoa_fisica",
    "transferencia_interna",
    "nao_classificada",
  ]),
  dre_behavior: z.enum(["incluir_operacional", "fora_resultado", "nao_incluir"]),
  cashflow_behavior: z.enum(["operacional", "investimento", "financiamento", "socios", "transferencia_interna"]),
});

export const chartSubcategorySchema = z.object({
  category_id: z.string().uuid("Selecione a categoria."),
  name: z.string().min(1, "Informe o nome da subcategoria."),
  code: z.string().optional().or(z.literal("")),
});
