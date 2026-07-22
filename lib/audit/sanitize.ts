/**
 * Higienização dos valores gravados em audit_logs.
 *
 * Função pura (sem banco) — testada em tests/fase12-audit.test.ts.
 *
 * Regras:
 * - Chaves com nomes sensíveis (senha, token, chave, secret...) têm o valor
 *   substituído por "[removido]" em qualquer nível de profundidade.
 * - Strings muito longas são truncadas (logs são para rastreio, não para
 *   restaurar dados — anexos e textos grandes não pertencem ao log).
 * - Objetos aninhados além de 4 níveis são resumidos, evitando payloads
 *   gigantes ou ciclos.
 */

const SENSITIVE_KEY_PATTERN = /senha|password|token|secret|api[_-]?key|service[_-]?role|authorization|smtp[_-]?pass/i;

const MAX_STRING_LENGTH = 500;
const MAX_DEPTH = 4;

export function sanitizeAuditValue<T>(value: T, depth = 0): T | null | string {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    return value.length > MAX_STRING_LENGTH ? ((value.slice(0, MAX_STRING_LENGTH) + "…[truncado]") as T) : value;
  }

  if (typeof value === "number" || typeof value === "boolean") return value;

  if (depth >= MAX_DEPTH) return "[objeto resumido]";

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => sanitizeAuditValue(item, depth + 1)) as unknown as T;
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        result[key] = "[removido]";
      } else {
        result[key] = sanitizeAuditValue(val, depth + 1);
      }
    }
    return result as unknown as T;
  }

  return String(value) as unknown as T;
}
