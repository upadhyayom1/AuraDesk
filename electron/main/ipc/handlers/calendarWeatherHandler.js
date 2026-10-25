/**
 * Calendar & Weather IPC Handlers
 * Registers channels for Google Calendar integration, event bindings, and weather telemetry.
 * Channels:
 * - calendar:connect
 * - calendar:disconnect
 * - calendar:status
 * - calendar:upcoming
 * - calendar:binding:list
 * - calendar:binding:create
 * - calendar:binding:delete
 * - weather:setLocation
 * - weather:current
 */

const { ipcMain } = require('electron');
const { ipcSuccess, ipcError } = require('../../utils/ipcResponse');
const {
  CalendarUpcomingSchema,
  CalendarBindingCreateSchema,
  WeatherSetLocationSchema
} = require('../../../../shared/schemas/index');

/**
 * Registers calendar and weather IPC handlers
 * @param {import('../../services/calendar/CalendarService')} calendarService
 * @param {import('../../services/weather/WeatherService')} weatherService
 */
function registerCalendarWeatherHandlers(calendarService, weatherService) {
  // ==========================================
  // GOOGLE CALENDAR CHANNELS
  // ==========================================

  // 1. calendar:connect
  ipcMain.handle('calendar:connect', async () => {
    try {
      if (!calendarService) {
        return ipcError('INTERNAL_ERROR', 'CalendarService is not available');
      }
      const res = await calendarService.connect();
      return ipcSuccess(res);
    } catch (err) {
      return ipcError('AUTH_REQUIRED', err.message);
    }
  });

  // 2. calendar:disconnect
  ipcMain.handle('calendar:disconnect', async () => {
    try {
      if (!calendarService) return ipcSuccess({ ok: true });
      const res = await calendarService.disconnect();
      return ipcSuccess({ ok: true, ...res });
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 3. calendar:status
  ipcMain.handle('calendar:status', async () => {
    try {
      if (!calendarService) {
        return ipcSuccess({ connected: false, account: null, lastSyncAt: null });
      }
      const status = calendarService.getStatus();
      return ipcSuccess(status);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 4. calendar:upcoming
  ipcMain.handle('calendar:upcoming', async (_event, payload) => {
    try {
      if (!calendarService) return ipcSuccess([]);
      const parsed = CalendarUpcomingSchema.safeParse(payload || {});
      const hours = parsed.success ? parsed.data.hours : 24;
      const events = calendarService.getUpcoming(hours);
      return ipcSuccess(events);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 5. calendar:binding:list
  ipcMain.handle('calendar:binding:list', async () => {
    try {
      if (!calendarService) return ipcSuccess([]);
      const bindings = calendarService.listBindings();
      return ipcSuccess(bindings);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 6. calendar:binding:create
  ipcMain.handle('calendar:binding:create', async (_event, payload) => {
    try {
      if (!calendarService) {
        return ipcError('INTERNAL_ERROR', 'CalendarService is not available');
      }
      const parsed = CalendarBindingCreateSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', parsed.error.errors.map(e => e.message).join(', '));
      }

      const created = calendarService.createBinding(parsed.data);
      return ipcSuccess(created);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 7. calendar:binding:delete
  ipcMain.handle('calendar:binding:delete', async (_event, payload) => {
    try {
      if (!calendarService) return ipcSuccess({ ok: true });
      const id = typeof payload === 'string' ? payload : payload?.id;
      if (!id) {
        return ipcError('VALIDATION', 'Binding ID is required');
      }

      const ok = calendarService.deleteBinding(id);
      return ipcSuccess({ ok });
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // ==========================================
  // WEATHER TELEMETRY CHANNELS
  // ==========================================

  // 8. weather:setLocation
  ipcMain.handle('weather:setLocation', async (_event, payload) => {
    try {
      if (!weatherService) {
        return ipcError('INTERNAL_ERROR', 'WeatherService is not available');
      }
      const parsed = WeatherSetLocationSchema.safeParse(payload || {});
      if (!parsed.success) {
        return ipcError('VALIDATION', 'Location must include either city name or lat/lon coordinates');
      }

      const updatedWeather = await weatherService.setLocation(parsed.data);
      return ipcSuccess(updatedWeather);
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });

  // 9. weather:current
  ipcMain.handle('weather:current', async () => {
    try {
      if (!weatherService) {
        return ipcSuccess({
          condition: 'Clear',
          tempC: 22,
          isDay: true,
          fetchedAt: new Date().toISOString(),
          cached: true
        });
      }

      const weather = await weatherService.getCurrentWeather();
      return ipcSuccess({
        ...weather,
        cached: !weather.isFallback
      });
    } catch (err) {
      return ipcError('INTERNAL_ERROR', err.message);
    }
  });
}

module.exports = {
  registerCalendarWeatherHandlers
};
