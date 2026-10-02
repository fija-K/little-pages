import { webcrypto } from 'node:crypto';
import { runStorageSanityTest } from './src/utils/storageSanityTest.js';
import { runVaultUpgradeTest } from './src/utils/vaultUpgradeTest.js';

// Setup minimal Web Crypto & LocalStorage mock environment for Node
if (!global.window) {
  global.window = {
    crypto: webcrypto
  };
} else if (!global.window.crypto) {
  global.window.crypto = webcrypto;
}

const localStorageMap = new Map();
global.localStorage = {
  getItem: (key) => localStorageMap.get(key) || null,
  setItem: (key, val) => localStorageMap.set(key, String(val)),
  removeItem: (key) => localStorageMap.delete(key),
  clear: () => localStorageMap.clear()
};

async function main() {
  console.log('--- RUNNING STORAGE SANITY TEST ---');
  const sanityResult = await runStorageSanityTest();
  console.log('Sanity Test Success:', sanityResult.success);
  if (sanityResult.errors.length > 0) {
    console.error('Sanity Errors:', sanityResult.errors);
  } else {
    console.log('Zero readable plaintext metadata fields found on encrypted objects!');
  }

  console.log('\n--- RUNNING VAULT UPGRADE & ROLLBACK TEST ---');
  const upgradeResult = await runVaultUpgradeTest();
  console.log('Upgrade Test Success:', upgradeResult.success);
  console.log('Upgrade Test Logs:\n', upgradeResult.logs.join('\n'));
  if (upgradeResult.errors.length > 0) {
    console.error('Upgrade Errors:', upgradeResult.errors);
  }

  if (sanityResult.success && upgradeResult.success) {
    console.log('\n✅ ALL SECURITY & PRIVACY VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } else {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
