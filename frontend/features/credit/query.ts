import { LEDGER_TYPES, type LedgerType } from "@/features/credit/types";

/** URL의 type 값을 내역 필터로 바꾼다. 모르는 값은 전체로 본다 */
export function parseLedgerType(value: string | string[] | undefined): LedgerType {
  return LEDGER_TYPES.find((type) => type === value) ?? "all";
}
