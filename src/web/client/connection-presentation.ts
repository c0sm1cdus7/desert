import type { JourneyAvailability } from '../../availability-types.ts';
import { rendererLocale } from '../../messages/renderer-locale.ts';
import { Messages, m } from '../../messages/keys.ts';

// Every sentence this module shows a person is a key of the `connectionPresentation` namespace it owns (plan §14).
const bundle = Messages.bundle(rendererLocale);

/** Presentation of current dependency evidence, never an Internet connectivity guess. */
export function connectionPresentation(value: JourneyAvailability | undefined): 'loading' | 'ready' | 'offline' {
  if (value?.dependenciesReady) return 'ready';
  return !value || value.blockers.every(item => item.reason === 'unknown') ? 'loading' : 'offline';
}

export function unavailableReason(value: JourneyAvailability | undefined): string | undefined {
  if (value?.dependenciesReady) return undefined;
  if (value?.blockers.some(item => item.reason === 'session-required')) return bundle.text(m.connectionPresentation.unlock);
  if (value?.blockers.some(item => item.reason === 'incompatible')) return bundle.text(m.connectionPresentation.incompatible);
  return connectionPresentation(value) === 'loading' ? bundle.text(m.connectionPresentation.connecting) : bundle.text(m.connectionPresentation.unavailable);
}
