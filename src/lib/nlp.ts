/**
 * Simple NLP Pre-processor for Voice Commands
 * Fixes common phonetic errors from WebSpeech API before sending to LLM.
 */
export function cleanVoiceCommand(rawText: string): string {
    let clean = rawText.toLowerCase();

    // 1. Fix Entity Names (Robot Identifiers)
    // "Robot ate" -> "Robot A"
    // "Robot be" -> "Robot B"
    // "Robot see" -> "Robot C"
    clean = clean.replace(/robot\s+ate?\b/gi, "Robot A");
    clean = clean.replace(/robot\s+eight\b/gi, "Robot A");
    clean = clean.replace(/robot\s+be\b/gi, "Robot B");
    clean = clean.replace(/robot\s+bee\b/gi, "Robot B");
    clean = clean.replace(/robot\s+sea\b/gi, "Robot C");
    clean = clean.replace(/robot\s+see\b/gi, "Robot C");

    // 2. Fix Action Verbs
    // "Petrol" -> "Patrol"
    // "Inspecter" -> "Inspect"
    clean = clean.replace(/\bpetrol\b/gi, "patrol");
    clean = clean.replace(/\bcontrol\b/gi, "patrol"); // Common mis-hear
    clean = clean.replace(/\binspecter\b/gi, "inspect");

    // 3. Fix Coordinates / Numbers
    // "Five zero" -> "50" (Gemini handles this well, but good for consistency)
    // "Two two" -> "2 2"

    // Capitalize first letter for display niceness
    return clean.charAt(0).toUpperCase() + clean.slice(1);
}
