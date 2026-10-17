/**
 * Anonymous Participant ID
 * ========================
 * Generates or retrieves a browser-local UUID used to identify students
 * without requiring account creation.
 *
 * IMPORTANT:
 * - This is a casual duplicate-attempt prevention mechanism only.
 * - It is NOT identity verification.
 * - A motivated user could clear localStorage to get a new ID.
 * - The database enforces the constraint, but this ID is client-generated.
 */

const STORAGE_KEY = 'sjcem_participant_id';

/**
 * Generate a v4-like UUID using the Web Crypto API.
 * Falls back to Math.random if crypto is unavailable.
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback (older browsers)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Returns the participant ID for this browser.
 * Creates and persists one if it doesn't exist yet.
 * @returns {string} UUID string
 */
export function getParticipantId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id || id.trim() === '') {
      id = generateUUID();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // localStorage may be blocked (private browsing in some browsers).
    // Generate a session-only ID (will not prevent duplicate attempts across reloads).
    return generateUUID();
  }
}
