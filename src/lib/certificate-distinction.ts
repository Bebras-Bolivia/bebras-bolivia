import type { Certificate } from './certificate-crypto';

export type Distinction =
  | { kind: 'podium'; rank: number }
  | { kind: 'merit' }
  | { kind: 'participation' };

/** La elección manual tiene prioridad sobre el puesto calculado. */
export function distinctionOf(certificate: Certificate): Distinction {
  const { rank, rankOf } = certificate;
  if (certificate.distinction) return { kind: certificate.distinction };
  if (rank && rank <= 3) return { kind: 'podium', rank };
  if (rank && rankOf && rankOf >= 10 && rank <= Math.ceil(rankOf * 0.1)) return { kind: 'merit' };
  return { kind: 'participation' };
}
