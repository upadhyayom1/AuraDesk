/**
 * Personalization IPC Handlers (Context-Aware Personalization)
 * Registers channels for rules, overrides, context state, and mock controls.
 * Channels:
 * - personalization:getState
 * - personalization:setEnabled
 * - rule:list
 * - rule:create
 * - rule:update
 * - rule:delete
 * - rule:reorder
 * - personalization:evaluate
 * - override:set
 * - override:clear
 * - personalization:setMockContext
 * - personalization:getMockContext
 * - personalization:clearMockContext
 */

const { ipcMain } = require('electron');
const { ipcSuccess, ipcError } = require('../../utils/ipcResponse');
const {
  RuleCreateSchema,
  RuleUpdateSchema,
  RuleReorderSchema,
  OverrideSetSchema
} = require('../../../../shared/schemas/index');

/**
 * Registers all personalization & rule IPC handlers
 * @param {import('../../services/personalization/PersonalizationEngine')} personalizationEngine
 * @param {import('../../services/settings/AppSettings')} appSettings
 * @param {Function} [getMainWindow]
 */
function registerPersonalizationHandlers(personalizationEngine, appSettings, getMainWindow = null) {
  if (!personalizationEngine) {
    console.warn('[PersonalizationHandler] PersonalizationEngine not provided; handlers not registered.');
    return;
  }

  const broadcastState = async () => {
    if (!getMainWindow) return;
    try {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        const context = await personalizationEngine.getContext();
        const activeRule = await personalizationEngine.evaluateRules(context);
        const override = personalizationEngine.getOverride();
        win.webContents.send('personalization:state', {
          activeRule,
          override,
          context
        });
      }
    } catch (e) {
      // Ignore broadcast errors during shutdown
    }
  };

  // 1. personalization:getState
  ipcMain.handle('personalization:getState', async () => {
    try {
      const context = await personalizationEngine.getContext();
      const activeRule = await personalizationEngine.evaluateRules(context);
      const override = personalizationEngine.getOverride();
      const settings = appSettings?.getSettings ? appSettings.getSettings() : appSettings?.cachedSettings;
      const enabled = settings?.autoAdaptEnabled !== false;

      return ipcSuccess({
        enabled,
        activeRule,
        override,
        context
      });
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 2. personalization:setEnabled
  ipcMain.handle('personalization:setEnabled', async (_event, payload) => {
    try {
      const enabled = Boolean(payload?.enabled);
      if (appSettings && typeof appSettings.save === 'function') {
        await appSettings.save({ autoAdaptEnabled: enabled });
      }
      broadcastState();
      return ipcSuccess({ enabled });
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 3. rule:list
  ipcMain.handle('rule:list', async () => {
    try {
      const rules = personalizationEngine.listRules();
      return ipcSuccess(rules);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 4. rule:create
  ipcMain.handle('rule:create', async (_event, payload) => {
    try {
      const parsed = RuleCreateSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.errors.map(e => e.message).join(', '));
      }

      const created = personalizationEngine.createRule(parsed.data);
      broadcastState();
      return ipcSuccess(created);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 5. rule:update
  ipcMain.handle('rule:update', async (_event, payload) => {
    try {
      const parsed = RuleUpdateSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.errors.map(e => e.message).join(', '));
      }

      const updated = personalizationEngine.updateRule(parsed.data.id, parsed.data.patch);
      if (!updated) {
        return ipcError('NOT_FOUND', `Rule not found with ID: ${parsed.data.id}`);
      }
      broadcastState();
      return ipcSuccess(updated);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 6. rule:delete
  ipcMain.handle('rule:delete', async (_event, payload) => {
    try {
      const id = typeof payload === 'string' ? payload : payload?.id;
      if (!id) {
        return ipcError('VALIDATION', 'Rule ID is required');
      }

      const ok = personalizationEngine.deleteRule(id);
      broadcastState();
      return ipcSuccess({ ok });
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 7. rule:reorder
  ipcMain.handle('rule:reorder', async (_event, payload) => {
    try {
      const parsed = RuleReorderSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', 'ruleIds must be a non-empty array of rule IDs');
      }

      const reordered = personalizationEngine.reorderRules(parsed.data.ruleIds);
      broadcastState();
      return ipcSuccess(reordered);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 8. personalization:evaluate (Dry run "Test My Rules" without altering desktop)
  ipcMain.handle('personalization:evaluate', async (_event, payload) => {
    try {
      const context = payload?.context || await personalizationEngine.getContext();
      const matchedRule = await personalizationEngine.evaluateRules(context);
      const decision = await personalizationEngine.chooseWallpaper(context);

      return ipcSuccess({
        matchedRule,
        wallpaper: decision?.wallpaper || null,
        trigger: decision?.trigger || null,
        collectionId: decision?.collectionId || null
      });
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 9. override:set
  ipcMain.handle('override:set', async (_event, payload) => {
    try {
      const parsed = OverrideSetSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.errors.map(e => e.message).join(', '));
      }

      const wallpaperId = parsed.data.wallpaperId || parsed.data.localPath;
      if (!wallpaperId) {
        return ipcError('VALIDATION', 'Either wallpaperId or localPath must be provided');
      }

      const override = personalizationEngine.setOverride(wallpaperId, parsed.data.expiresAt);
      broadcastState();
      return ipcSuccess({ ok: true, override });
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 10. override:clear
  ipcMain.handle('override:clear', async () => {
    try {
      const ok = personalizationEngine.clearOverride();
      broadcastState();
      return ipcSuccess({ ok });
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 11. personalization:setMockContext
  ipcMain.handle('personalization:setMockContext', async (_event, payload) => {
    try {
      personalizationEngine.setMockContext(payload || null);
      broadcastState();
      return ipcSuccess({ mockContext: personalizationEngine.getMockContext() });
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 12. personalization:getMockContext
  ipcMain.handle('personalization:getMockContext', async () => {
    try {
      return ipcSuccess({ mockContext: personalizationEngine.getMockContext() });
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 13. personalization:clearMockContext
  ipcMain.handle('personalization:clearMockContext', async () => {
    try {
      personalizationEngine.clearMockContext();
      broadcastState();
      return ipcSuccess({ ok: true });
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });
}

module.exports = {
  registerPersonalizationHandlers
};
