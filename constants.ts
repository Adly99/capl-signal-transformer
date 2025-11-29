import { SignalMapping, TestMode } from "./types";

export const DEFAULT_CAPL_CODE = `/* CAPL Test Node */
variables {
  message EngineStatus msgEngine;
  timer tCheck;
}

on start {
  setTimer(tCheck, 100);
}

on timer tCheck {
  // Read engine speed
  if ($EngineSpeed > 3000) {
    write("High Speed Detected: %f", $EngineSpeed);
    
    // Check specific message signal
    if (EngineMsg.Torque > 250.0) {
      // Trigger protection
      output(msgEngine);
    }
  }
}

on key 'a' {
  $EngineSpeed = 0;
  EngineMsg.Torque = 0;
}
`;

export const DEFAULT_MAPPINGS: SignalMapping[] = [
  {
    id: '1',
    realSignal: '$EngineSpeed',
    simSignal: 'sysvar::Engine::Speed',
    description: 'Engine Speed RPM'
  },
  {
    id: '2',
    realSignal: 'EngineMsg.Torque',
    simSignal: 'sysvar::Powertrain::Torque',
    description: 'Engine Torque Nm'
  },
  {
    id: '3',
    realSignal: 'output(msgEngine)',
    simSignal: 'sysvar::Bus::InjectFrame(msgEngine)',
    description: 'Output function replacement'
  }
];

export const MAPPING_PRESETS: Record<string, SignalMapping[]> = {
  'Powertrain (Default)': DEFAULT_MAPPINGS,
  'Body Control': [
    { id: 'b1', realSignal: '$DoorStatus', simSignal: 'sysvar::Body::DoorState', description: 'Door Open/Close' },
    { id: 'b2', realSignal: 'Lights.Headlight', simSignal: 'sysvar::Lights::HeadlightOn', description: 'Headlights' },
    { id: 'b3', realSignal: '$WindowPos', simSignal: 'sysvar::Body::WindowPosition', description: 'Window Position' },
    { id: 'b4', realSignal: 'output(msgBody)', simSignal: 'sysvar::Bus::InjectFrame(msgBody)', description: 'Output replacement' }
  ],
  'ADAS Sensors': [
    { id: 'a1', realSignal: '$RadarObj1_Dist', simSignal: 'sysvar::Sensors::Radar::Obj1::Dist', description: 'Radar Distance' },
    { id: 'a2', realSignal: 'CameraMsg.LaneDev', simSignal: 'sysvar::Sensors::Camera::LaneDeviation', description: 'Lane Deviation' },
    { id: 'a3', realSignal: '$AEB_Active', simSignal: 'sysvar::ADAS::AEB_Status', description: 'AEB Trigger' }
  ]
};

export const INITIAL_MODE = TestMode.SIL; // Default to transforming TO Simulation

export const NODE_CLI_TEMPLATE = `/**
 * CAPL Signal Transformer - CI/CD CLI Tool
 * Auto-generated from Web Interface
 * 
 * Usage: node capl-transformer.js <input_path> <output_path> [options]
 * 
 * Options:
 *   --mode=HIL             Convert System Variables -> Real Signals
 *   --mode=SIL             Convert Real Signals -> System Variables (Default)
 *   --mapping=<file.json>  Load external JSON mapping rules (overrides embedded)
 * 
 * Example:
 *   node capl-transformer.js input.can output.can --mode=SIL --mapping=rules.json
 */

const fs = require('fs');

// --- EMBEDDED CONFIGURATION (DEFAULT) ---
const EMBEDDED_MAPPINGS = __MAPPINGS_JSON__;

// --- TRANSFORMER LOGIC ---
const TestMode = { HIL: 'HIL', SIL: 'SIL' };

function performTransformation(code, mode, mappings) {
  let transformedCode = code;
  let changesCount = 0;

  // Sort mappings by length to avoid partial matches
  const sortedMappings = [...mappings].sort((a, b) => {
    const lenA = mode === TestMode.SIL ? (a.realSignal || "").length : (a.simSignal || "").length;
    const lenB = mode === TestMode.SIL ? (b.realSignal || "").length : (b.simSignal || "").length;
    return lenB - lenA;
  });

  sortedMappings.forEach((map) => {
    const source = mode === TestMode.SIL ? map.realSignal : map.simSignal;
    const target = mode === TestMode.SIL ? map.simSignal : map.realSignal;

    if (!source || !target) return;

    // Regex escape for replacement
    const escapedSource = source.replace(/[.*+?^\\\${}()|[\\]\\\\]/g, '\\\\$&');
    const regex = new RegExp(escapedSource, 'g');
    
    const matches = transformedCode.match(regex);
    if (matches) {
      changesCount += matches.length;
      transformedCode = transformedCode.replace(regex, target);
    }
  });

  return { code: transformedCode, changes: changesCount };
}

// --- MAIN EXECUTION ---
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log("------------------------------------------------");
  console.log(" CAPL Signal Transformer CLI");
  console.log("------------------------------------------------");
  console.log(" Usage: node capl-transformer.js <input> <output> [options]");
  console.log(" Options:");
  console.log("   --mode=<HIL|SIL>       Target environment");
  console.log("   --mapping=<path>       Path to external JSON mapping file");
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1];
const modeArg = args.find(a => a.startsWith('--mode='));
const mappingArg = args.find(a => a.startsWith('--mapping='));

const mode = modeArg ? modeArg.split('=')[1].toUpperCase() : 'SIL';
let activeMappings = EMBEDDED_MAPPINGS;

// Handle external mapping file
if (mappingArg) {
  const mappingPath = mappingArg.split('=')[1];
  try {
    if (fs.existsSync(mappingPath)) {
      console.log(\`Loading external mappings from \${mappingPath}...\`);
      const fileContent = fs.readFileSync(mappingPath, 'utf8');
      activeMappings = JSON.parse(fileContent);
      if (!Array.isArray(activeMappings)) {
        throw new Error("Mapping file must contain a JSON array.");
      }
    } else {
      throw new Error(\`Mapping file not found: \${mappingPath}\`);
    }
  } catch (err) {
    console.error("Error loading mapping file:", err.message);
    process.exit(1);
  }
} else {
  console.log("Using embedded default mappings.");
}

try {
  if (!fs.existsSync(inputFile)) {
      throw new Error("Input file not found: " + inputFile);
  }
  
  console.log(\`Reading \${inputFile}...\`);
  const code = fs.readFileSync(inputFile, 'utf8');
  
  console.log(\`Applying \${activeMappings.length} mapping rules (Mode: \${mode})...\`);
  const result = performTransformation(code, mode, activeMappings);
  
  fs.writeFileSync(outputFile, result.code);
  console.log(\`Success: Written to \${outputFile}\`);
  console.log(\`Changes made: \${result.changes}\`);
  
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
`;

export const README_CONTENT = `# CAPL Signal Transformer - User Manual

## 1. Overview
The CAPL Signal Transformer is a specialized utility for Automotive Software Engineers. It automates the refactoring of Vector CAPL (CAN Access Programming Language) test scripts when moving between physical test benches (HIL) and virtual simulation environments (SIL).

## 2. Transformation Modes
- **SIL Mode (Target: Simulation)**: Converts Real Signals (e.g., \`$EngineSpeed\`, \`Msg.Signal\`) -> System Variables (e.g., \`sysvar::Engine::Speed\`).
- **HIL Mode (Target: Hardware)**: Converts System Variables -> Real Signals.

## 3. Managing Mappings
The tool relies on a precise mapping table to perform substitutions.

### Manual Editing
- Use the **Mapping Rules** sidebar to add pairs manually.
- **ID**: Unique identifier (auto-generated).
- **HIL (Real)**: The signal name as used in CAN/LIN.
- **SIL (SysVar)**: The corresponding system variable.

### JSON Import/Export
- You can upload a \`.json\` file containing an array of rule objects.
- Structure:
  \`\`\`json
  [
    {
      "id": "1",
      "realSignal": "$EngineSpeed",
      "simSignal": "sysvar::Engine::Speed",
      "description": "RPM Signal"
    }
  ]
  \`\`\`

## 4. AI-Powered Features
- **AI Scan**: Scans your source code to identify potential real signals and suggests mapping rules automatically.
- **Smart AI Refactor**: Uses Gemini models to perform context-aware code transformation for complex patterns that Regex cannot handle.

## 5. Jenkins & CI/CD Integration
Enable headless automation for your build pipelines.

1. **Export the CLI Tool**
   - Click the **Export CLI** button in the header.
   - Downloads \`capl-transformer.js\` with your *current mappings embedded*.

2. **Run in Node.js**
   \`\`\`bash
   # Syntax
   node capl-transformer.js <input> <output> --mode=<HIL|SIL> [--mapping=<file.json>]

   # Example with embedded rules
   node capl-transformer.js test.can test_sil.can --mode=SIL

   # Example with external mapping file
   node capl-transformer.js test.can test_sil.can --mode=SIL --mapping=mappings.json
   \`\`\`

3. **Jenkins Pipeline Example**
   \`\`\`groovy
   stage('CAPL Transformation') {
       steps {
           // Using an external mapping file maintained in the repo
           sh 'node capl-transformer.js src/test.can dist/test.can --mode=SIL --mapping=configs/mapping.json'
       }
   }
   \`\`\`

## 6. Internal Terminal (CLI)
Press **~ (Tilde)** to open the built-in console.

### Commands
- **upload**: Open file picker for Source Code.
- **upload mapping**: Open file picker for JSON Rules.
- **run**: Execute transformation immediately.
- **swap**: Move Output -> Input and toggle Mode (for round-trip verification).
- **download**: Save the transformed file.
- **export**: Download the CI/CD script.
- **mode [hil | sil]**: Switch target environment.
- **clear**: Clear the editor.

## 7. Troubleshooting
- **Partial Matches**: The tool automatically sorts rules by length (longest first) to prevent partial replacement errors (e.g. replacing \`$Speed\` inside \`$SpeedFront\`).
- **Syntax Errors**: Use the built-in JSON validator in the Mapping Editor to check your rules.
`;