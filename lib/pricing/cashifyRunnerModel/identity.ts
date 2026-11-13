/** Samsung catalog entries may keep RAM separate from their storage label. */
export function runnerStorageIdentity(storage?: string | null, ram?: string | null): string {
  const value=String(storage??'');
  return (!value.includes('/') && ram ? `${ram}/${value}` : value).toLowerCase().replace(/\s/g,'');
}
