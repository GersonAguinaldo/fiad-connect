export const AMBASSADOR_CATEGORY = "Ambassadeur du Développement";
export const DEFAULT_MEMBER_CATEGORY = "Sympathisant";
export const DEFAULT_AMBASSADOR_FEE_AMOUNT = 25000;
export const DEFAULT_AMBASSADOR_FEE_CURRENCY = "XOF";

export function getCotisationReason(year = new Date().getFullYear()) {
  return `Cotisation ambassadeur ${year}`;
}
