export const DEFAULT_CHECK_KEY = "working_order";
export const DEFAULT_CHECK_LABEL = "Gear Item in Working Order";

export type ChecklistTemplate = Record<string, string>;
export type ChecklistValues = Record<string, boolean>;

export function ensureDefaultTemplate(template?: ChecklistTemplate | null): ChecklistTemplate {
  const base = template || {};
  if (base[DEFAULT_CHECK_KEY] !== DEFAULT_CHECK_LABEL) {
    return { [DEFAULT_CHECK_KEY]: DEFAULT_CHECK_LABEL, ...base };
  }
  return base;
}

export function ensureDefaultChecks(checks?: ChecklistValues | null): ChecklistValues {
  const base = checks || {};
  if (!(DEFAULT_CHECK_KEY in base)) {
    return { [DEFAULT_CHECK_KEY]: false, ...base };
  }
  return base;
}