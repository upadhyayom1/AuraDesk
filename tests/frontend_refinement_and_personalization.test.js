/**
 * Frontend Refinement, Dark Mode, Personalization & Wallpaper Rotation Test
 * Verifies all 7 master prompt requirements.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting Frontend Refinement & Personalization Verification Tests...\n');

// 1. Verify TeamInfoModal is completely deleted and no entry points exist
console.log('1. Auditing Team Information Modal Removal...');
const teamInfoModalPath = path.join(__dirname, '../frontend/src/components/TeamInfoModal.tsx');
assert.strictEqual(fs.existsSync(teamInfoModalPath), false, 'TeamInfoModal.tsx must be completely removed');

const appTsxContent = fs.readFileSync(path.join(__dirname, '../frontend/src/App.tsx'), 'utf-8');
assert.strictEqual(appTsxContent.includes('TeamInfoModal'), false, 'App.tsx must not reference TeamInfoModal');
assert.strictEqual(appTsxContent.includes('isTeamModalOpen'), false, 'App.tsx must not have team modal state');
assert.strictEqual(appTsxContent.includes('onOpenTeam'), false, 'App.tsx must not pass onOpenTeam prop');

const sidebarContent = fs.readFileSync(path.join(__dirname, '../frontend/src/components/MacSidebar.tsx'), 'utf-8');
assert.strictEqual(sidebarContent.includes('onOpenTeam'), false, 'MacSidebar must not have onOpenTeam prop');
assert.strictEqual(sidebarContent.includes('Team 220'), false, 'MacSidebar must not reference Team 220');
assert.strictEqual(sidebarContent.includes('Softablitz 2026'), false, 'MacSidebar must not reference Softablitz 2026');

const settingsContent = fs.readFileSync(path.join(__dirname, '../frontend/src/components/SettingsModal.tsx'), 'utf-8');
assert.strictEqual(settingsContent.includes('onOpenTeam'), false, 'SettingsModal must not have onOpenTeam prop');
assert.strictEqual(settingsContent.includes('Softablitz'), false, 'SettingsModal must not reference Softablitz');
console.log('✅ Team Information Modal and all entry points completely removed\n');

// 2. Auditing Competition Branding Removal from all Frontend Source Files
console.log('2. Auditing Competition Branding Removal from Frontend...');
const frontendSrcDir = path.join(__dirname, '../frontend/src');

function scanDirForDisallowedWords(dir, disallowedPatterns) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDirForDisallowedWords(fullPath, disallowedPatterns);
    } else if (entry.isFile() && /\.(tsx?|jsx?|html|css)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      for (const pattern of disallowedPatterns) {
        const matches = content.match(pattern);
        assert.strictEqual(
          matches,
          null,
          `File ${entry.name} contains forbidden text: ${matches ? matches[0] : ''}`
        );
      }
    }
  }
}

scanDirForDisallowedWords(frontendSrcDir, [
  /softablitz/i,
  /team\s*220/i,
  /three\s*musketeers/i,
]);
console.log('✅ All competition branding removed from entire frontend source\n');

// 3. Verifying Product Identity & Subtitle
console.log('3. Verifying Product Identity & Subtitle...');
assert.strictEqual(sidebarContent.includes('AuraDesk'), true, 'MacSidebar must preserve AuraDesk name');
assert.strictEqual(
  sidebarContent.includes('Intelligent Wallpaper Personalization'),
  true,
  'MacSidebar must have subtitle: Intelligent Wallpaper Personalization'
);
console.log('✅ Product name and subtitle verified\n');

// 4. Verifying Views & Sidebar Navigation Tabs
console.log('4. Verifying Views & Sidebar Navigation Tabs...');
const personalizationViewPath = path.join(__dirname, '../frontend/src/components/PersonalizationView.tsx');
const rotationViewPath = path.join(__dirname, '../frontend/src/components/RotationView.tsx');
assert.strictEqual(fs.existsSync(personalizationViewPath), true, 'PersonalizationView.tsx must exist');
assert.strictEqual(fs.existsSync(rotationViewPath), true, 'RotationView.tsx must exist');

assert.strictEqual(appTsxContent.includes('<RotationView'), true, 'App.tsx must mount RotationView');
assert.strictEqual(appTsxContent.includes('<PersonalizationView'), true, 'App.tsx must mount PersonalizationView');

assert.strictEqual(sidebarContent.includes("'rotation'"), true, 'MacSidebar must contain rotation tab');
assert.strictEqual(sidebarContent.includes("'personalization'"), true, 'MacSidebar must contain personalization tab');
assert.strictEqual(sidebarContent.includes('Wallpaper Rotation'), true, 'MacSidebar must display Wallpaper Rotation label');
assert.strictEqual(sidebarContent.includes('Personalization'), true, 'MacSidebar must display Personalization label');
console.log('✅ Navigation tabs and view mounting verified\n');

// 5. Verifying Electron Bridge Methods for Personalization, Rotation & Calendar
console.log('5. Verifying Electron Bridge Methods...');
const bridgeContent = fs.readFileSync(path.join(__dirname, '../frontend/src/services/electronBridge.ts'), 'utf-8');

const requiredMethods = [
  'getPersonalizationState',
  'setPersonalizationEnabled',
  'listRules',
  'createRule',
  'updateRule',
  'deleteRule',
  'reorderRules',
  'evaluatePersonalization',
  'setOverride',
  'clearOverride',
  'getCalendarStatus',
  'connectCalendar',
  'disconnectCalendar',
  'getUpcomingCalendarEvents',
  'listCalendarBindings',
  'createCalendarBinding',
  'deleteCalendarBinding',
  'getCurrentWeather',
  'setWeatherLocation',
  'rotateNow',
  'getRotationConfig',
  'setRotationConfig',
  'pauseRotation',
  'resumeRotation',
  'getRotationHistory',
  'clearRotationHistory',
  'closeWindow',
  'minimizeWindow',
  'toggleMaximizeWindow',
];

for (const method of requiredMethods) {
  assert.strictEqual(
    bridgeContent.includes(`${method}(`) || bridgeContent.includes(`async ${method}(`) || bridgeContent.includes(`${method}:`),
    true,
    `electronBridge must implement ${method}`
  );
}
console.log(`✅ All ${requiredMethods.length} bridge methods present in electronBridge.ts\n`);

// 6. Verifying Unified Theme System and CSS Tokens
console.log('6. Verifying Unified Theme System and CSS Tokens...');
const cssContent = fs.readFileSync(path.join(__dirname, '../frontend/src/index.css'), 'utf-8');
assert.strictEqual(cssContent.includes('.mac-glass-panel-dark'), true, '.mac-glass-panel-dark must be defined');
assert.strictEqual(cssContent.includes('.mac-glass-card'), true, '.mac-glass-card must be defined');
assert.strictEqual(cssContent.includes('.mac-modal-dark'), true, '.mac-modal-dark must be defined');
assert.strictEqual(cssContent.includes('.mac-modal-light'), true, '.mac-modal-light must be defined');
console.log('✅ Theme tokens defined in index.css\n');

console.log('🎉 ALL FRONTEND REFINEMENT & PERSONALIZATION VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉\n');

