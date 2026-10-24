/**
 * AuraDesk IPC Response Utilities
 * Adheres to standard IPC envelope: { ok, data, error: { code, message } }
 */

/**
 * Creates a successful IPC response
 * @param {any} data
 * @returns {{ ok: true, data: any }}
 */
function ipcSuccess(data = null) {
  return {
    ok: true,
    data
  };
}

/**
 * Creates a standardized IPC error response
 * @param {'VALIDATION' | 'NOT_FOUND' | 'RATE_LIMITED' | 'OFFLINE' | 'APPLY_FAILED' | 'AUTH_REQUIRED' | 'INTERNAL_ERROR'} code
 * @param {string} message
 * @returns {{ ok: false, error: { code: string, message: string } }}
 */
function ipcError(code, message) {
  return {
    ok: false,
    error: {
      code,
      message: message || 'An unknown error occurred'
    }
  };
}

module.exports = {
  ipcSuccess,
  ipcError
};
