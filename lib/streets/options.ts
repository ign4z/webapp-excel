// Vie selezionabili nello Step 1 per un comune: nomi e civici, MAI prezzi (la route che le espone è pubblica).
import { loadStreetMap } from '@/lib/streets';
import { getOfficialStreets } from '@/lib/streets/anncsu';
import { isCompatiblePartial } from '@/lib/street-import';
import { romanNumeralVariant } from '@/lib/google-geocode';
import { formatStreetLabel, type StreetOption } from '@/lib/street-search';

const civicSort = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true });

/**
 * Vie della lista prezzi del comune (i nomi coincidono con le chiavi usate dal lookup), con i civici
 * della lista più quelli ufficiali ANNCSU. Se la lista è vuota si usano le vie ANNCSU (prezzo di default);
 * se non c'è nemmeno quella (frazioni) la lista è vuota e lo Step 1 accetta la via scritta a mano.
 */
export async function getStreetOptions(slug: string): Promise<StreetOption[]> {
  const { map } = await loadStreetMap(slug);
  const official = getOfficialStreets(slug)?.streets ?? {};

  const civiciByStreet = new Map<string, Set<string>>();
  for (const key of Object.keys(map)) {
    const [street, civic] = key.split(':');
    if (!civiciByStreet.has(street)) civiciByStreet.set(street, new Set());
    if (civic) civiciByStreet.get(street)!.add(civic);
  }
  if (civiciByStreet.size === 0) {
    for (const name of Object.keys(official)) civiciByStreet.set(name.toLowerCase(), new Set());
  }

  // Civici ANNCSU: la via in lista ha il nome Google, che può differire da quello ANNCSU
  // ("via xxv aprile" / "VIA VENTICINQUE APRILE", "via romanoni" / "VIA CARLO ROMANONI")
  const officialNames = Object.keys(official);
  const officialFor = (street: string): string[] => {
    const exact = officialNames.find((n) => n.toLowerCase() === street || romanNumeralVariant(n)?.toLowerCase() === street);
    if (exact) return official[exact];
    const compatible = officialNames.filter((n) => isCompatiblePartial(n, street));
    return compatible.length === 1 ? official[compatible[0]] : [];
  };

  return [...civiciByStreet.entries()]
    .map(([name, civici]) => ({
      name,
      label: formatStreetLabel(name),
      civici: [...new Set([...civici, ...officialFor(name)])].sort(civicSort),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
