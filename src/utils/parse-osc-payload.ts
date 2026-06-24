type WrappedOscValue = string | number | boolean;

/**
 * Parses raw wrapped OSC string signatures like 'Float(72.0)' or 'String("Chorus")'
 * into native JavaScript primitives.
 */
function parseOscValue(raw: WrappedOscValue): any {
  if (typeof raw !== 'string') return raw;

  const match = raw.match(/^(\w+)\("?(.*?)"?\)$/);
  if (!match) return raw;

  const [, type, value] = match;

  switch (type) {
    case 'Float':
    case 'Int':
      return Number(value);
    case 'Bool':
    case 'Boolean':
      return value.toLowerCase() === 'true';
    case 'None':
    case 'Nil':
      return null;
    default:
      return value; // Falls back to standard string contents
  }
}

/**
 * A highly reusable, generic OSC layout deserializer.
 * @template T The target shape or array type you expect back.
 * @param rawArgs The raw string array coming from the OSC event loop.
 * @param chunkBy Optional grouping size (e.g., 2 for pairing [name, time] objects).
 */
export function parseOscPayload<T>(rawArgs: WrappedOscValue[], chunkBy?: number): T {
  // 1. Unpack all wrappers to clean JS primitives
  const flatCleanValues = rawArgs.map(parseOscValue);

  // 2. If no chunking is needed, return the flat array cast to our type
  if (!chunkBy || chunkBy <= 1) {
    return flatCleanValues as unknown as T;
  }

  // 3. Handle chunk parsing for structured records/objects
  const groupedResult: any[] = [];
  for (let i = 0; i < flatCleanValues.length; i += chunkBy) {
    const chunk = flatCleanValues.slice(i, i + chunkBy);
    if (chunk.length === chunkBy) {
      groupedResult.push(chunk);
    }
  }

  return groupedResult as unknown as T;
}