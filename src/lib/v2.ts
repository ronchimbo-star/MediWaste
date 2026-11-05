export const isV2KillSwitchOn = import.meta.env.VITE_V2_ENABLED === 'true';

export function isV2ActiveForCustomer(customer: { v2_enabled?: boolean | null }) {
  return isV2KillSwitchOn && customer.v2_enabled === true;
}
