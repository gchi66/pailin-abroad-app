import fs from 'node:fs';
import path from 'node:path';

const cliRoot = path.join(
  process.cwd(),
  'node_modules/expo/node_modules/@expo/cli/build/src/start'
);

function patchFile(relativePath, replacements) {
  const filePath = path.join(cliRoot, relativePath);
  if (!fs.existsSync(filePath)) {
    console.warn(`[DeviceHub patch] Expo CLI file not found: ${relativePath}`);
    return;
  }

  let source = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const { before, after, marker } of replacements) {
    if (source.includes(marker)) continue;
    if (!source.includes(before)) {
      throw new Error(`[DeviceHub patch] Expected code not found in ${relativePath}`);
    }
    source = source.replace(before, after);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, source);
    console.log(`[DeviceHub patch] Updated ${relativePath}`);
  }
}

patchFile('doctor/apple/SimulatorAppPrerequisite.js', [
  {
    before: `    return null;\n}\n/**\n * Fallback: locate Simulator.app`,
    after: `    try {\n        return (await (0, _osascript().execAsync)('id of app "DeviceHub"')).trim();\n    } catch  {\n    }\n    return null;\n}\n/**\n * Fallback: locate Simulator.app`,
    marker: `id of app "DeviceHub"`,
  },
  {
    before: `        const simulatorInfoPlist = _path().default.join(developerDir.trim(), 'Applications', 'Simulator.app', 'Contents', 'Info.plist');\n        const { stdout: bundleId } = await (0, _spawnasync().default)('defaults', [\n            'read',\n            simulatorInfoPlist,\n            'CFBundleIdentifier'\n        ]);\n        return bundleId.trim() || null;`,
    after: `        const appInfoPlists = [\n            _path().default.join(developerDir.trim(), 'Applications', 'Simulator.app', 'Contents', 'Info.plist'),\n            _path().default.join(developerDir.trim(), '..', 'Applications', 'DeviceHub.app', 'Contents', 'Info.plist')\n        ];\n        for (const appInfoPlist of appInfoPlists) {\n            try {\n                const { stdout: bundleId } = await (0, _spawnasync().default)('defaults', [\n                    'read',\n                    appInfoPlist,\n                    'CFBundleIdentifier'\n                ]);\n                if (bundleId.trim()) return bundleId.trim();\n            } catch  {\n            }\n        }\n        return null;`,
    marker: `'DeviceHub.app', 'Contents', 'Info.plist'`,
  },
  {
    before: `if (result !== 'com.apple.iphonesimulator' && result !== 'com.apple.CoreSimulator.SimulatorTrampoline') {`,
    after: `if (result !== 'com.apple.dt.Devices' && result !== 'com.apple.iphonesimulator' && result !== 'com.apple.CoreSimulator.SimulatorTrampoline') {`,
    marker: `result !== 'com.apple.dt.Devices'`,
  },
  {
    before: `        }\n        return null;\n    } catch  {\n    // Simulator.app not found`,
    after: `        }\n        if (require('fs').existsSync(_path().default.join(developerDir.trim(), '..', 'Applications', 'DeviceHub.app'))) {\n            return 'com.apple.dt.Devices';\n        }\n        return null;\n    } catch  {\n    // Simulator.app not found`,
    marker: `return 'com.apple.dt.Devices';`,
  },
]);

patchFile('platforms/ios/ensureSimulatorAppRunning.js', [
  {
    before: `tell app "System Events" to count processes whose name is "Simulator"`,
    after: `tell app "System Events" to count processes whose name is "Simulator" or name is "DeviceHub"`,
    marker: `or name is "DeviceHub"`,
  },
  {
    before: `    await (0, _spawnasync().default)('open', args);\n}`,
    after: `    try {\n        await (0, _spawnasync().default)('open', args);\n    } catch  {\n        const deviceHubArgs = device.udid ? [\n            'devices://device/open?id=' + device.udid\n        ] : [\n            '-a',\n            'DeviceHub'\n        ];\n        await (0, _spawnasync().default)('open', deviceHubArgs);\n    }\n}`,
    marker: `devices://device/open?id=`,
  },
]);

patchFile('platforms/ios/AppleDeviceManager.js', [
  {
    before: `        await _osascript().execAsync(\`tell application "Simulator" to activate\`);`,
    after: `        try {\n            await _osascript().execAsync(\`tell application "Simulator" to activate\`);\n        } catch  {\n            await _osascript().execAsync(\`tell application "DeviceHub" to activate\`);\n        }`,
    marker: `tell application "DeviceHub" to activate`,
  },
]);

