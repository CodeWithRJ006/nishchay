export function canonicalJson(value: any): string {
  if (value === null) return 'null';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Non-finite numbers are not allowed');
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') {
    return JSON.stringify(value.normalize('NFC'));
  }
  if (typeof value === 'undefined') throw new Error('undefined is not allowed');
  
  if (Array.isArray(value)) {
    const elements = value.map(canonicalJson).join(',');
    return `[${elements}]`;
  }
  
  if (typeof value === 'object') {
    if (value instanceof Date) {
      return JSON.stringify(value.toISOString());
    }
    
    const keys = Object.keys(value).sort();
    const elements = [];
    for (const key of keys) {
      if (value[key] === undefined) continue;
      elements.push(`${JSON.stringify(key.normalize('NFC'))}:${canonicalJson(value[key])}`);
    }
    return `{${elements.join(',')}}`;
  }
  
  throw new Error(`Unsupported type: ${typeof value}`);
}
