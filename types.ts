export enum TestMode {
  HIL = 'HIL', // Hardware-in-the-Loop (Real Signals)
  SIL = 'SIL', // Software-in-the-Loop (System Variables / DLL)
}

export interface SignalMapping {
  id: string;
  realSignal: string; // e.g., "EngineMsg.Speed" or "$EngineSpeed"
  simSignal: string;  // e.g., "sysvar::Engine::Speed" or "EnvVar_Speed"
  description?: string;
}

export interface TransformationResult {
  code: string;
  changes: number;
}
