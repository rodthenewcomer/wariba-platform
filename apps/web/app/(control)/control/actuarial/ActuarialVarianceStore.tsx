'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ActuarialVarianceDTO } from './actions';

interface Store {
  variance: ActuarialVarianceDTO | null;
  setVariance: (variance: ActuarialVarianceDTO) => void;
}

const ActuarialVarianceContext = createContext<Store | null>(null);

/**
 * Holds the comparison the operator is currently looking at.
 *
 * ## Why a provider rather than a refresh
 *
 * The button that records a comparison and the card that displays it are in
 * two different places on this page: the button belongs to a row of the runs
 * table, because *which* run to compare is the operator's choice, and the card
 * sits below as the console's single ÉCART reading. `revalidatePath` marked the
 * route stale but did not update the render the operator was looking at, so a
 * successful write left the card still reading "Aucune comparaison
 * enregistrée" — indistinguishable, from the operator's seat, from a write
 * that silently failed.
 *
 * The value that travels through here is the canonical row the server just
 * wrote, never a comparison assembled in the browser. Server-rendered children
 * pass through untouched, so the runs table and the history table stay server
 * components.
 */
export function ActuarialVarianceProvider({
  initialVariance,
  children,
}: {
  initialVariance: ActuarialVarianceDTO | null;
  children: ReactNode;
}) {
  const [variance, setVariance] = useState(initialVariance);
  const value = useMemo<Store>(() => ({ variance, setVariance }), [variance]);
  return (
    <ActuarialVarianceContext.Provider value={value}>{children}</ActuarialVarianceContext.Provider>
  );
}

export function useActuarialVariance(): Store {
  const store = useContext(ActuarialVarianceContext);
  if (!store) {
    throw new Error('useActuarialVariance must be used inside <ActuarialVarianceProvider>.');
  }
  return store;
}
