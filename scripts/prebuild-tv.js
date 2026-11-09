const { spawnSync } = require('node:child_process');

const result = spawnSync(
  process.execPath,
  [require.resolve('expo/bin/cli'), 'prebuild', '--clean'],
  {
    env: { ...process.env, EXPO_TV: '1' },
    stdio: 'inherit',
  }
);

if (result.error) {
  console.error(`Failed to start Expo prebuild: ${result.error.message}`);
  process.exitCode = 1;
} else if (result.signal) {
  console.error(`Expo prebuild terminated by signal ${result.signal}.`);
  process.exitCode = 1;
} else {
  process.exitCode = result.status ?? 1;
}
