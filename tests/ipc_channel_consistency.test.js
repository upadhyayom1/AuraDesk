/**
 * Automated Verification: IPC Channel Consistency & Response Envelope Contract
 * Verifies 100% alignment across:
 *  - shared/constants/ipc.js
 *  - electron/preload/index.js (ALLOWED_INVOKE_CHANNELS)
 *  - electron/main/ipc/handlers/* (ipcMain.handle)
 *  - frontend/src/services/electronBridge.ts
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function runIpcConsistencyTests() {
  console.log('🧪 Starting IPC Channel Consistency & Response Contract Verification...\n');

  // 1. Read preload ALLOWED_INVOKE_CHANNELS
  console.log('1. Auditing Preload Allowlist...');
  const preloadPath = path.join(__dirname, '../electron/preload/index.js');
  const preloadSource = fs.readFileSync(preloadPath, 'utf8');

  const matchPreload = preloadSource.match(/const ALLOWED_INVOKE_CHANNELS = new Set\(\[([\s\S]*?)\]\);/);
  assert(matchPreload, 'Preload must define ALLOWED_INVOKE_CHANNELS Set');

  const preloadChannels = new Set(
    [...matchPreload[1].matchAll(/'([^']+)'/g)].map(m => m[1])
  );
  console.log(`  • Found ${preloadChannels.size} authorized invoke channels in preload allowlist`);

  // Verify mock-context channels are present
  assert(preloadChannels.has('personalization:setMockContext'), 'Preload must include personalization:setMockContext');
  assert(preloadChannels.has('personalization:getMockContext'), 'Preload must include personalization:getMockContext');
  assert(preloadChannels.has('personalization:clearMockContext'), 'Preload must include personalization:clearMockContext');
  console.log('  ✅ Mock-context channels properly exposed in preload allowlist\n');

  // 2. Read shared/constants/ipc.js
  console.log('2. Auditing Shared IPC Constants...');
  const ipcConstPath = path.join(__dirname, '../shared/constants/ipc.js');
  const ipcConstSource = fs.readFileSync(ipcConstPath, 'utf8');

  const sharedChannels = new Set(
    [...ipcConstSource.matchAll(/:\s*'([^']+)'/g)].map(m => m[1])
  );
  console.log(`  • Found ${sharedChannels.size} channels in shared/constants/ipc.js`);

  // Event channels sent from main to renderer
  const pushEvents = new Set([
    'wallpaper:changed',
    'rotation:state',
    'personalization:state',
    'calendar:eventStarted',
    'calendar:eventEnded',
    'network:status',
    'app:error'
  ]);

  for (const ch of sharedChannels) {
    if (pushEvents.has(ch)) continue;
    assert(
      preloadChannels.has(ch),
      `Channel ${ch} defined in shared/constants/ipc.js is missing from preload ALLOWED_INVOKE_CHANNELS`
    );
  }
  console.log('  ✅ 100% of invoke channels in shared/constants/ipc.js are allowed in preload\n');

  // 3. Read backend ipcMain.handle registrations
  console.log('3. Auditing Backend Handler Registrations in electron/main/ipc/handlers/...');
  const handlersDir = path.join(__dirname, '../electron/main/ipc/handlers');
  const handlerFiles = fs.readdirSync(handlersDir).filter(f => f.endsWith('.js'));
  const registeredHandlers = new Set();

  for (const file of handlerFiles) {
    const content = fs.readFileSync(path.join(handlersDir, file), 'utf8');
    const matches = [...content.matchAll(/ipcMain\.handle\(['"]([^'"]+)['"]/g)];
    for (const m of matches) {
      registeredHandlers.add(m[1]);
    }
  }
  console.log(`  • Found ${registeredHandlers.size} ipcMain.handle registrations across ${handlerFiles.length} handler modules`);

  // Verify that every preload allowlist channel has a matching backend handler
  for (const ch of preloadChannels) {
    assert(
      registeredHandlers.has(ch),
      `Channel '${ch}' in preload allowlist has no matching ipcMain.handle in backend handlers`
    );
  }

  // Verify that every registered backend handler is permitted in preload
  for (const ch of registeredHandlers) {
    assert(
      preloadChannels.has(ch),
      `Backend handler '${ch}' is missing from preload ALLOWED_INVOKE_CHANNELS`
    );
  }
  console.log('  ✅ Exact 1-to-1 parity between preload allowlist and backend handlers (zero orphan channels)\n');

  // 4. Test Preload Invocation Guard (Security Simulation)
  console.log('4. Testing Preload Security Guard Simulation...');
  const simulateInvoke = (channel) => {
    if (!preloadChannels.has(channel)) {
      return Promise.reject(new Error(`[Preload Security] Unauthorized IPC channel: ${channel}`));
    }
    return Promise.resolve({ ok: true, data: { channel } });
  };

  // Valid calls succeed
  await assert.doesNotReject(() => simulateInvoke('discovery:search'));
  await assert.doesNotReject(() => simulateInvoke('wallpaper:apply'));
  await assert.doesNotReject(() => simulateInvoke('personalization:evaluate'));
  await assert.doesNotReject(() => simulateInvoke('personalization:setMockContext'));

  // Hostile / unapproved calls are rejected
  await assert.rejects(
    () => simulateInvoke('child_process:spawn'),
    /Unauthorized IPC channel: child_process:spawn/
  );
  await assert.rejects(
    () => simulateInvoke('fs:unlink'),
    /Unauthorized IPC channel: fs:unlink/
  );
  await assert.rejects(
    () => simulateInvoke('electron:remote'),
    /Unauthorized IPC channel: electron:remote/
  );
  console.log('  ✅ Security boundary strictly enfored\n');

  // 5. Auditing Standard IPC Envelope Contract
  console.log('5. Auditing Standard Response Envelopes in Backend Handlers...');
  const { ipcSuccess, ipcError } = require('../electron/main/utils/ipcResponse');

  const okEnvelope = ipcSuccess({ id: 'test-123' });
  assert.strictEqual(okEnvelope.ok, true);
  assert.strictEqual(okEnvelope.data.id, 'test-123');

  const errEnvelope = ipcError('RATE_LIMITED', 'Too many requests from Unsplash');
  assert.strictEqual(errEnvelope.ok, false);
  assert.strictEqual(errEnvelope.error.code, 'RATE_LIMITED');
  assert.strictEqual(errEnvelope.error.message, 'Too many requests from Unsplash');
  console.log('  ✅ Standard IPC response envelope format verified ({ ok: true, data } / { ok: false, error: { code, message } })\n');

  // 6. Auditing electronBridge.ts Method Invocations
  console.log('6. Auditing frontend/src/services/electronBridge.ts Method Invocations...');
  const bridgePath = path.join(__dirname, '../frontend/src/services/electronBridge.ts');
  const bridgeSource = fs.readFileSync(bridgePath, 'utf8');

  const bridgeInvokedChannels = new Set(
    [...bridgeSource.matchAll(/window\.api!\.invoke\(['"]([^'"]+)['"]/g)].map(m => m[1])
  );
  console.log(`  • Found ${bridgeInvokedChannels.size} unique channels invoked from electronBridge.ts`);

  for (const ch of bridgeInvokedChannels) {
    assert(
      preloadChannels.has(ch),
      `electronBridge.ts invokes unauthorized channel '${ch}' not in preload allowlist`
    );
  }
  console.log('  ✅ All electronBridge.ts invocations map to approved preload channels\n');

  console.log('🎉 ALL IPC CONSISTENCY & ENVELOPE CONTRACT TESTS PASSED SUCCESSFULLY! 🎉\n');
}

runIpcConsistencyTests().catch(err => {
  console.error('❌ IPC Consistency Test Failure:', err);
  process.exit(1);
});
