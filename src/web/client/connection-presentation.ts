import type { JourneyAvailability } from '../../availability-types.ts';

/** Presentation of current dependency evidence, never an Internet connectivity guess. */
export function connectionPresentation(value: JourneyAvailability | undefined): 'loading' | 'ready' | 'offline' {
  if (value?.dependenciesReady) return 'ready';
  return !value || value.blockers.every(item => item.reason === 'unknown') ? 'loading' : 'offline';
}

export function unavailableReason(value: JourneyAvailability | undefined): string | undefined {
  if (value?.dependenciesReady) return undefined;
  if (value?.blockers.some(item => item.reason === 'session-required')) return 'Unlock your identity to reconnect to the controller.';
  if (value?.blockers.some(item => item.reason === 'incompatible')) return 'This controller requires a compatible surface version.';
  return connectionPresentation(value) === 'loading' ? 'Connecting to the controller…' : 'Controller unavailable. Reconnect to use this action.';
}
