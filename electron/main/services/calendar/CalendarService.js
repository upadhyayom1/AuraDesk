/**
 * CalendarService
 * Google Calendar Integration (OAuth 2.0 PKCE)
 * Implements:
 * - Loopback HTTP redirect with PKCE (code_verifier and code_challenge)
 * - Encrypted token storage in SQLite settings table via Electron safeStorage (with AES fallback)
 * - 5-minute event synchronization and cache maintenance in calendar_events_cache
 * - Timed (start.dateTime) and all-day (start.date) normalization
 * - Keyword and Event ID collection bindings via calendar_bindings table
 */

const http = require('http');
const url = require('url');
const crypto = require('crypto');
const { google } = require('googleapis');

let electronSafeStorage = null;
let electronShell = null;

try {
  const electron = require('electron');
  electronSafeStorage = electron.safeStorage || null;
  electronShell = electron.shell || null;
} catch {
  // Headless / non-electron environment
}

const SETTINGS_KEY = 'google_calendar_tokens';
const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

class CalendarService {
  /**
   * @param {Object} [options={}]
   * @param {import('../../database/repositories/settingsRepo')} options.settingsRepo
   * @param {import('../../database/repositories/calendarEventsRepo')} options.calendarEventsRepo
   * @param {import('../../database/repositories/calendarBindingsRepo')} options.calendarBindingsRepo
   * @param {string} [options.clientId]
   * @param {string} [options.clientSecret]
   * @param {number} [options.pollIntervalMs=300000]
   * @param {Function} [options.openExternalFn] - Injectable for browser opening in tests
   * @param {Object} [options.customCalendarClient] - Injectable Google Calendar API client for unit tests
   */
  constructor(options = {}) {
    this.settingsRepo = options.settingsRepo || null;
    this.calendarEventsRepo = options.calendarEventsRepo || null;
    this.calendarBindingsRepo = options.calendarBindingsRepo || null;

    this.clientId = options.clientId || process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = options.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '';
    this.pollIntervalMs = options.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS;
    this.openExternalFn = options.openExternalFn || (electronShell ? electronShell.openExternal.bind(electronShell) : null);
    this.customCalendarClient = options.customCalendarClient || null;

    this.oauth2Client = null;
    this.pollTimer = null;
    this.account = null;
    this.lastSyncAt = null;

    // Load any saved credentials
    this._restoreStoredTokens();
  }

  /**
   * Generates a high-entropy PKCE code_verifier and S256 code_challenge
   * @returns {{ codeVerifier: string, codeChallenge: string }}
   */
  generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
  }

  /**
   * Encrypts plaintext token using Electron safeStorage, or AES-256 fallback if safeStorage unavailable
   * @param {string} plainText
   * @returns {string} base64 encrypted payload
   * @private
   */
  _encrypt(plainText) {
    if (!plainText) return '';

    if (electronSafeStorage && typeof electronSafeStorage.isEncryptionAvailable === 'function' && electronSafeStorage.isEncryptionAvailable()) {
      return `safe:${electronSafeStorage.encryptString(plainText).toString('base64')}`;
    }

    // AES-256-CBC Fallback for test / headless environments
    const secretKey = crypto.createHash('sha256').update('auradesk-calendar-secure-key').digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', secretKey, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return `aes:${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypts encrypted token string
   * @param {string} cipherText
   * @returns {string} plaintext token
   * @private
   */
  _decrypt(cipherText) {
    if (!cipherText) return '';

    if (cipherText.startsWith('safe:')) {
      const b64 = cipherText.slice('safe:'.length);
      const buf = Buffer.from(b64, 'base64');
      if (electronSafeStorage && typeof electronSafeStorage.decryptString === 'function') {
        return electronSafeStorage.decryptString(buf);
      }
    }

    if (cipherText.startsWith('aes:')) {
      const parts = cipherText.split(':');
      if (parts.length === 3) {
        const iv = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        const secretKey = crypto.createHash('sha256').update('auradesk-calendar-secure-key').digest();
        const decipher = crypto.createDecipheriv('aes-256-cbc', secretKey, iv);
        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }
    }

    // Direct plain or base64 fallback
    try {
      return Buffer.from(cipherText, 'base64').toString('utf8');
    } catch {
      return cipherText;
    }
  }

  /**
   * Restores stored tokens from SQLite settings table and initializes OAuth2 client
   * @private
   */
  _restoreStoredTokens() {
    if (!this.settingsRepo) return;

    try {
      const stored = this.settingsRepo.get(SETTINGS_KEY);
      if (stored && stored.encryptedTokens) {
        const jsonStr = this._decrypt(stored.encryptedTokens);
        const tokens = JSON.parse(jsonStr);

        this.account = stored.account || null;
        this.lastSyncAt = stored.lastSyncAt || null;

        this._setupOAuthClient(tokens);
        this.startPolling();
      }
    } catch (err) {
      console.warn('[CalendarService] Could not restore stored tokens:', err.message);
    }
  }

  /**
   * Sets up google.auth.OAuth2 with given tokens and automated refresh listener
   * @param {Object} tokens
   * @private
   */
  _setupOAuthClient(tokens) {
    this.oauth2Client = new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      'http://127.0.0.1' // updated dynamically during loopback
    );

    this.oauth2Client.setCredentials(tokens);

    // Save refreshed tokens automatically
    this.oauth2Client.on('tokens', (newTokens) => {
      const currentStored = this.settingsRepo ? this.settingsRepo.get(SETTINGS_KEY) : null;
      let existingTokens = {};
      if (currentStored && currentStored.encryptedTokens) {
        try {
          existingTokens = JSON.parse(this._decrypt(currentStored.encryptedTokens));
        } catch {}
      }

      const mergedTokens = { ...existingTokens, ...newTokens };
      this._saveTokens(mergedTokens, this.account);
    });
  }

  /**
   * Persists tokens securely into SQLite settings table
   * @param {Object} tokens
   * @param {string} [account]
   * @private
   */
  _saveTokens(tokens, account = null) {
    if (!this.settingsRepo) return;

    const encrypted = this._encrypt(JSON.stringify(tokens));
    this.settingsRepo.set(SETTINGS_KEY, {
      encryptedTokens: encrypted,
      account: account || this.account,
      lastSyncAt: this.lastSyncAt || new Date().toISOString()
    });

    if (account) this.account = account;
  }

  /**
   * Checks whether Calendar integration is currently connected
   * @returns {boolean}
   */
  isConnected() {
    return Boolean(this.oauth2Client && this.account);
  }

  /**
   * Returns connection status, account, and lastSyncAt timestamp
   * @returns {{ connected: boolean, account: string | null, lastSyncAt: string | null }}
   */
  getStatus() {
    return {
      connected: this.isConnected(),
      account: this.account,
      lastSyncAt: this.lastSyncAt
    };
  }

  /**
   * Starts a temporary local HTTP loopback server on a random port for receiving OAuth code
   * @returns {Promise<{ port: number, redirectUri: string, waitForCode: Promise<string>, close: () => void }>}
   * @private
   */
  _startLoopbackServer() {
    return new Promise((resolve, reject) => {
      let server;
      let timeoutHandle;

      const codePromise = new Promise((resolveCode, rejectCode) => {
        server = http.createServer((req, res) => {
          const parsed = url.parse(req.url, true);
          if (parsed.pathname === '/' || parsed.pathname === '') {
            const { code, error } = parsed.query;

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            if (code) {
              res.end(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>AuraDesk - Calendar Connected</title>
                    <style>
                      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
                      .card { text-align: center; background: rgba(30, 41, 59, 0.7); backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 40px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5); }
                      h1 { color: #38bdf8; margin-bottom: 12px; }
                      p { color: #94a3b8; font-size: 15px; }
                    </style>
                  </head>
                  <body>
                    <div class="card">
                      <h1>✨ Google Calendar Connected</h1>
                      <p>AuraDesk has successfully linked your calendar. You may now close this browser window.</p>
                    </div>
                  </body>
                </html>
              `);
              clearTimeout(timeoutHandle);
              resolveCode(String(code));
            } else {
              res.end(`
                <!DOCTYPE html>
                <html>
                  <body style="font-family: sans-serif; text-align: center; padding-top: 50px; background: #0f172a; color: #f87171;">
                    <h2>Connection Cancelled or Failed</h2>
                    <p>${error || 'No authorization code received'}</p>
                  </body>
                </html>
              `);
              clearTimeout(timeoutHandle);
              rejectCode(new Error(`OAuth Loopback Error: ${error || 'User cancelled'}`));
            }

            // Close server shortly after serving response
            setTimeout(() => {
              try { server.close(); } catch {}
            }, 500);
          }
        });

        // 2-minute timeout for user to complete OAuth in browser
        timeoutHandle = setTimeout(() => {
          try { server.close(); } catch {}
          rejectCode(new Error('OAuth loopback authorization timed out after 2 minutes'));
        }, 120000);
      });

      server.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        const redirectUri = `http://127.0.0.1:${port}`;
        resolve({
          port,
          redirectUri,
          waitForCode: codePromise,
          close: () => {
            clearTimeout(timeoutHandle);
            try { server.close(); } catch {}
          }
        });
      });

      server.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Initiates Google OAuth 2.0 PKCE flow in default system browser
   * @returns {Promise<{ connected: boolean, account: string }>}
   */
  async connect() {
    if (!this.clientId) {
      throw new Error('Google OAuth Client ID is not configured (set GOOGLE_CLIENT_ID)');
    }

    const { codeVerifier, codeChallenge } = this.generatePKCE();
    const loopback = await this._startLoopbackServer();

    try {
      const oauth2Client = new google.auth.OAuth2(
        this.clientId,
        this.clientSecret,
        loopback.redirectUri
      );

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/userinfo.email'
        ],
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        prompt: 'consent'
      });

      if (this.openExternalFn) {
        await this.openExternalFn(authUrl);
      } else {
        console.log(`[CalendarService] Open the following URL in your browser to authorize:\n${authUrl}`);
      }

      // Wait for user to authorize in browser and redirect back to loopback server
      const code = await loopback.waitForCode;

      // Exchange authorization code for access and refresh tokens
      const { tokens } = await oauth2Client.getToken({
        code,
        codeVerifier,
        redirect_uri: loopback.redirectUri
      });

      oauth2Client.setCredentials(tokens);
      this.oauth2Client = oauth2Client;

      // Fetch user email to identify connected account
      let userEmail = 'Google User';
      try {
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        if (userInfo.data?.email) {
          userEmail = userInfo.data.email;
        }
      } catch (err) {
        console.warn('[CalendarService] Could not retrieve user profile email:', err.message);
      }

      this.account = userEmail;
      this._saveTokens(tokens, userEmail);

      // Perform initial events sync and start 5-minute background polling
      await this.syncUpcomingEvents();
      this.startPolling();

      return {
        connected: true,
        account: this.account
      };
    } finally {
      loopback.close();
    }
  }

  /**
   * Disconnects calendar, clears tokens, stops polling, and flushes event cache
   * @returns {Promise<{ connected: boolean }>}
   */
  async disconnect() {
    this.stopPolling();

    if (this.oauth2Client) {
      try {
        const creds = this.oauth2Client.credentials;
        if (creds && (creds.access_token || creds.refresh_token)) {
          await this.oauth2Client.revokeToken(creds.access_token || creds.refresh_token);
        }
      } catch (err) {
        console.warn('[CalendarService] Token revocation error:', err.message);
      }
      this.oauth2Client = null;
    }

    if (this.settingsRepo) {
      this.settingsRepo.delete(SETTINGS_KEY);
    }

    if (this.calendarEventsRepo) {
      this.calendarEventsRepo.clearAll();
    }

    this.account = null;
    this.lastSyncAt = null;

    return { connected: false };
  }

  /**
   * Starts 5-minute event synchronization loop
   */
  startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(async () => {
      try {
        await this.syncUpcomingEvents();
      } catch (err) {
        console.warn('[CalendarService] Background poll error:', err.message);
      }
    }, this.pollIntervalMs);
  }

  /**
   * Stops background polling
   */
  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Normalizes incoming Google Calendar event
   * Correctly handles both timed (start.dateTime) and all-day (start.date) events
   * @param {Object} item
   * @returns {{ id: string, title: string, startTime: string, endTime: string } | null}
   */
  normalizeEvent(item) {
    if (!item || !item.id) return null;

    let startTime;
    let endTime;

    if (item.start?.dateTime) {
      startTime = new Date(item.start.dateTime).toISOString();
    } else if (item.start?.date) {
      // All-day event: start of that day (00:00:00 local/UTC)
      startTime = new Date(`${item.start.date}T00:00:00.000Z`).toISOString();
    } else {
      return null;
    }

    if (item.end?.dateTime) {
      endTime = new Date(item.end.dateTime).toISOString();
    } else if (item.end?.date) {
      // All-day event end
      endTime = new Date(`${item.end.date}T23:59:59.999Z`).toISOString();
    } else {
      // Default duration: 1 hour after start
      endTime = new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString();
    }

    return {
      id: String(item.id),
      title: (item.summary || 'Untitled Event').trim(),
      startTime,
      endTime
    };
  }

  /**
   * Polls upcoming events for next 7 days, normalizes, and syncs into calendar_events_cache table
   * @returns {Promise<Array<Object>>}
   */
  async syncUpcomingEvents() {
    if (!this.oauth2Client && !this.customCalendarClient) {
      return [];
    }

    const calendar = this.customCalendarClient || google.calendar({ version: 'v3', auth: this.oauth2Client });
    const now = new Date();
    const timeMin = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours in past to catch active events
    const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days in future

    try {
      const res = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const rawItems = res.data?.items || [];
      const normalizedEvents = rawItems.map(item => this.normalizeEvent(item)).filter(Boolean);

      if (this.calendarEventsRepo) {
        this.calendarEventsRepo.saveEvents(normalizedEvents);
        // Clean events older than 1 day
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        this.calendarEventsRepo.clearOldEvents(oneDayAgo);
      }

      this.lastSyncAt = new Date().toISOString();

      if (this.settingsRepo) {
        const stored = this.settingsRepo.get(SETTINGS_KEY);
        if (stored) {
          stored.lastSyncAt = this.lastSyncAt;
          this.settingsRepo.set(SETTINGS_KEY, stored);
        }
      }

      return normalizedEvents;
    } catch (err) {
      console.error('[CalendarService] Error syncing calendar events:', err.message);
      throw err;
    }
  }

  /**
   * Retrieves upcoming cached events for next N hours
   * @param {number} [hours=24]
   * @returns {Array<Object>}
   */
  getUpcoming(hours = 24) {
    if (!this.calendarEventsRepo) return [];
    return this.calendarEventsRepo.getUpcoming(hours);
  }

  /**
   * Returns currently active event at reference time (if any)
   * @param {Date | string} [now=new Date()]
   * @returns {Object | null}
   */
  getActiveEvent(now = new Date()) {
    if (!this.calendarEventsRepo) return null;
    return this.calendarEventsRepo.getActiveEvent(now);
  }

  /**
   * Matches an event or event summary against calendar_bindings table
   * @param {{ id?: string, summary?: string, title?: string } | string} eventOrSummary
   * @returns {string | null} collectionId
   */
  matchBinding(eventOrSummary) {
    if (!this.calendarBindingsRepo) return null;
    return this.calendarBindingsRepo.matchBinding(eventOrSummary);
  }

  /**
   * Lists all calendar keyword / event bindings sorted by priority ASC
   */
  listBindings() {
    if (!this.calendarBindingsRepo) return [];
    return this.calendarBindingsRepo.list();
  }

  /**
   * Creates a new calendar binding
   */
  createBinding(binding) {
    if (!this.calendarBindingsRepo) throw new Error('CalendarBindingsRepository not initialized');
    return this.calendarBindingsRepo.create(binding);
  }

  /**
   * Deletes a calendar binding by ID
   */
  deleteBinding(id) {
    if (!this.calendarBindingsRepo) return false;
    return this.calendarBindingsRepo.delete(id);
  }
}

module.exports = CalendarService;
