import { SignalMapping, TestMode, TransformationResult } from "../types";

/**
 * Fast, deterministic string replacement based on the mapping table.
 */
export const performLocalTransformation = (
  code: string,
  mode: TestMode,
  mappings: SignalMapping[]
): TransformationResult => {
  let transformedCode = code;
  let changesCount = 0;

  // Sort mappings by length (descending) to avoid partial replacement issues
  // e.g. replacing "$Speed" shouldn't break "$SpeedFront" if both exist
  const sortedMappings = [...mappings].sort((a, b) => {
    const lenA = mode === TestMode.SIL ? a.realSignal.length : a.simSignal.length;
    const lenB = mode === TestMode.SIL ? b.realSignal.length : b.simSignal.length;
    return lenB - lenA;
  });

  sortedMappings.forEach((map) => {
    const source = mode === TestMode.SIL ? map.realSignal : map.simSignal;
    const target = mode === TestMode.SIL ? map.simSignal : map.realSignal;

    if (!source || !target) return;

    // Escape special regex characters in the source string
    const escapedSource = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // We try to use word boundaries if the signal starts with alphanumeric, 
    // but CAPL signals like $Signal or Message.Signal have punctuation which complicates \b
    // For safety in this demo, we'll use a global replace with careful ordering.
    // A more advanced version would tokenize the CAPL code.
    
    const regex = new RegExp(escapedSource, 'g');
    
    // Count matches
    const matches = transformedCode.match(regex);
    if (matches) {
      changesCount += matches.length;
      transformedCode = transformedCode.replace(regex, target);
    }
  });

  return {
    code: transformedCode,
    changes: changesCount,
  };
};
