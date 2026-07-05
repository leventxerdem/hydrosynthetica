// Density values referenced in the paper's "Parçacık Özkütlesi / Boyutu" section:
// PET/PVC sink (denser than water), PP/PE tend to float, PS sits near-neutral.
export const POLYMER_PRESETS = [
  { id: 'pet', name: 'PET', density: 1.38, note: 'sinks' },
  { id: 'pvc', name: 'PVC', density: 1.25, note: 'sinks' },
  { id: 'ps', name: 'PS', density: 1.05, note: 'near-neutral' },
  { id: 'pe', name: 'PE', density: 0.94, note: 'floats' },
  { id: 'pp', name: 'PP', density: 0.9, note: 'floats' },
]
