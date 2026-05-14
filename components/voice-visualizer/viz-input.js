/**
 * Live mic snapshot: recording writes here each animation frame; the visualizer
 * RAF loop reads this object. Avoids React setState on every frame (major jank).
 */
export const vizAnalysisInput = {
  amplitude: 0,
  envelope: 0.18,
  bass: 0,
  mid: 0,
  high: 0,
  attack: 0,
  decay: 0,
  speaking: 0,
};

export function resetVizAnalysisInput() {
  vizAnalysisInput.amplitude = 0;
  vizAnalysisInput.envelope = 0.18;
  vizAnalysisInput.bass = 0;
  vizAnalysisInput.mid = 0;
  vizAnalysisInput.high = 0;
  vizAnalysisInput.attack = 0;
  vizAnalysisInput.decay = 0;
  vizAnalysisInput.speaking = 0;
}
