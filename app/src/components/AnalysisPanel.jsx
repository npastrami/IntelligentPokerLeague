// AnalysisPanel.jsx
import React, { useState } from "react";
import { ChartBarIcon, ArrowPathIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

const AnalysisPanel = ({
  analysisData,
  setAnalysisData,
}) => {
  const [selectedHand, setSelectedHand] = useState(null);
  const [preset, setPreset] = useState('equity');
  const [playerClass, setPlayerClass] = useState('fat cat');
  const [customColors, setCustomColors] = useState({});
  const [colorPickerHand, setColorPickerHand] = useState(null);

  // Create the 13x13 grid data
  const ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
  
  // Hand equity percentages (against random hand)
  const handEquity = {
    'AA': 85.2, 'KK': 82.4, 'QQ': 79.9, 'JJ': 77.5, 'TT': 75.1, '99': 72.1, '88': 69.0, '77': 66.1,
    '66': 63.4, '55': 60.7, '44': 57.9, '33': 55.2, '22': 52.3,
    'AKs': 67.0, 'AQs': 66.1, 'AJs': 65.4, 'ATs': 64.7, 'A9s': 62.8, 'A8s': 61.9, 'A7s': 61.0,
    'A6s': 60.1, 'A5s': 60.2, 'A4s': 59.9, 'A3s': 59.5, 'A2s': 59.1,
    'AK': 65.4, 'AQ': 64.5, 'AJ': 63.6, 'AT': 62.7, 'A9': 60.8, 'A8': 59.9, 'A7': 59.0,
    'A6': 58.1, 'A5': 58.2, 'A4': 57.9, 'A3': 57.5, 'A2': 57.1,
    'KQs': 63.4, 'KJs': 62.7, 'KTs': 62.0, 'K9s': 60.1, 'K8s': 59.2, 'K7s': 58.3, 'K6s': 57.4,
    'K5s': 56.5, 'K4s': 55.6, 'K3s': 54.7, 'K2s': 53.8,
    'KQ': 61.8, 'KJ': 61.1, 'KT': 60.4, 'K9': 58.5, 'K8': 57.6, 'K7': 56.7, 'K6': 55.8,
    'K5': 54.9, 'K4': 54.0, 'K3': 53.1, 'K2': 52.2,
    'QJs': 60.0, 'QTs': 59.3, 'Q9s': 57.4, 'Q8s': 56.5, 'Q7s': 55.6, 'Q6s': 54.7, 'Q5s': 53.8,
    'Q4s': 52.9, 'Q3s': 52.0, 'Q2s': 51.1,
    'QJ': 58.4, 'QT': 57.7, 'Q9': 55.8, 'Q8': 54.9, 'Q7': 54.0, 'Q6': 53.1, 'Q5': 52.2,
    'Q4': 51.3, 'Q3': 50.4, 'Q2': 49.5,
    'JTs': 56.6, 'J9s': 54.7, 'J8s': 53.8, 'J7s': 52.9, 'J6s': 52.0, 'J5s': 51.1, 'J4s': 50.2,
    'J3s': 49.3, 'J2s': 48.4,
    'JT': 55.0, 'J9': 53.1, 'J8': 52.2, 'J7': 51.3, 'J6': 50.4, 'J5': 49.5, 'J4': 48.6,
    'J3': 47.7, 'J2': 46.8,
    'T9s': 52.0, 'T8s': 51.1, 'T7s': 50.2, 'T6s': 49.3, 'T5s': 48.4, 'T4s': 47.5, 'T3s': 46.6,
    'T2s': 45.7,
    'T9': 50.4, 'T8': 49.5, 'T7': 48.6, 'T6': 47.7, 'T5': 46.8, 'T4': 45.9, 'T3': 45.0,
    'T2': 44.1,
    '98s': 48.4, '97s': 47.5, '96s': 46.6, '95s': 45.7, '94s': 44.8, '93s': 43.9, '92s': 43.0,
    '98': 46.8, '97': 45.9, '96': 45.0, '95': 44.1, '94': 43.2, '93': 42.3, '92': 41.4,
    '87s': 45.8, '86s': 44.9, '85s': 44.0, '84s': 43.1, '83s': 42.2, '82s': 41.3,
    '87': 44.2, '86': 43.3, '85': 42.4, '84': 41.5, '83': 40.6, '82': 39.7,
    '76s': 43.2, '75s': 42.3, '74s': 41.4, '73s': 40.5, '72s': 39.6,
    '76': 41.6, '75': 40.7, '74': 39.8, '73': 38.9, '72': 38.0,
    '65s': 40.6, '64s': 39.7, '63s': 38.8, '62s': 37.9,
    '65': 39.0, '64': 38.1, '63': 37.2, '62': 36.3,
    '54s': 38.0, '53s': 37.1, '52s': 36.2,
    '54': 36.4, '53': 35.5, '52': 34.6,
    '43s': 35.4, '42s': 34.5,
    '43': 33.8, '42': 32.9,
    '32s': 32.8,
    '32': 31.2
  };

  // Player class action frequencies (percentage chance of raise/call/fold)
  const playerStyles = {
    'nit': { // Very tight, very conservative
      premium: { raise: 85, call: 10, fold: 5 },
      strong: { raise: 25, call: 40, fold: 35 },
      playable: { raise: 5, call: 15, fold: 80 },
      marginal: { raise: 0, call: 5, fold: 95 },
      weak: { raise: 0, call: 0, fold: 100 }
    },
    'joker': { // Wild maniac - plays almost everything aggressively
      premium: { raise: 95, call: 5, fold: 0 },
      strong: { raise: 80, call: 15, fold: 5 },
      playable: { raise: 60, call: 30, fold: 10 },
      marginal: { raise: 40, call: 45, fold: 15 },
      weak: { raise: 25, call: 55, fold: 20 }
    },
    'wild cat': { // Loose aggressive
      premium: { raise: 90, call: 8, fold: 2 },
      strong: { raise: 70, call: 25, fold: 5 },
      playable: { raise: 45, call: 35, fold: 20 },
      marginal: { raise: 20, call: 50, fold: 30 },
      weak: { raise: 5, call: 25, fold: 70 }
    },
    'fat cat': { // Tight aggressive
      premium: { raise: 88, call: 10, fold: 2 },
      strong: { raise: 65, call: 30, fold: 5 },
      playable: { raise: 35, call: 40, fold: 25 },
      marginal: { raise: 10, call: 30, fold: 60 },
      weak: { raise: 2, call: 8, fold: 90 }
    },
    'cowboy': { // Calling station
      premium: { raise: 45, call: 50, fold: 5 },
      strong: { raise: 25, call: 65, fold: 10 },
      playable: { raise: 15, call: 70, fold: 15 },
      marginal: { raise: 8, call: 75, fold: 17 },
      weak: { raise: 3, call: 60, fold: 37 }
    }
  };

  // Get hand string for grid position
  const getHandString = (row, col) => {
    const rank1 = ranks[row];
    const rank2 = ranks[col];
    
    if (row === col) {
      return rank1 + rank1;
    } else if (row < col) {
      return rank1 + rank2 + 's';
    } else {
      return rank2 + rank1;
    }
  };

  // Get hand strength category
  const getHandStrength = (handString) => {
    const equity = handEquity[handString] || 30;
    if (equity >= 75) return 'premium';
    if (equity >= 65) return 'strong';
    if (equity >= 55) return 'playable';
    if (equity >= 45) return 'marginal';
    return 'weak';
  };

  // Get background color based on mode
  const getHandColor = (handString) => {
    if (preset === 'custom') {
      return customColors[handString] || 'bg-neutral-700';
    } else if (preset === 'equity') {
      const equity = handEquity[handString] || 30;
      if (equity >= 80) return 'bg-red-600';
      if (equity >= 70) return 'bg-red-500';
      if (equity >= 60) return 'bg-orange-500';
      if (equity >= 50) return 'bg-yellow-500';
      if (equity >= 40) return 'bg-green-500';
      if (equity >= 35) return 'bg-blue-500';
      return 'bg-gray-600';
    } else {
      // Action frequency mode
      const strength = getHandStrength(handString);
      const actions = playerStyles[playerClass][strength];
      const dominantAction = actions.raise > actions.call && actions.raise > actions.fold ? 'raise' :
                            actions.call > actions.fold ? 'call' : 'fold';
      
      if (dominantAction === 'raise') {
        if (actions.raise >= 80) return 'bg-red-600';
        if (actions.raise >= 60) return 'bg-red-500';
        if (actions.raise >= 40) return 'bg-orange-500';
        return 'bg-yellow-500';
      } else if (dominantAction === 'call') {
        return 'bg-blue-500';
      } else {
        return 'bg-gray-600';
      }
    }
  };

  // Get display value for each hand
  const getDisplayValue = (handString) => {
    if (preset === 'custom') {
      return '';
    } else if (preset === 'equity') {
      return Math.round(handEquity[handString] || 30);
    } else {
      const strength = getHandStrength(handString);
      const actions = playerStyles[playerClass][strength];
      const dominantAction = actions.raise > actions.call && actions.raise > actions.fold ? 'R' :
                            actions.call > actions.fold ? 'C' : 'F';
      const percentage = dominantAction === 'R' ? actions.raise : 
                        dominantAction === 'C' ? actions.call : actions.fold;
      return `${dominantAction}${percentage}`;
    }
  };

  // Convert hex color to Tailwind-style background
  const hexToBackgroundStyle = (hex) => {
    return hex ? { backgroundColor: hex } : {};
  };

  // Handle color change for custom mode
  const handleColorChange = (handString, color) => {
    setCustomColors(prev => ({
      ...prev,
      [handString]: color
    }));
  };

  // Reset custom colors
  const resetCustomColors = () => {
    setCustomColors({});
    setColorPickerHand(null);
  };

  return (
    <>
      {/* Analysis Header */}
      <div className="bg-neutral-900 p-3 border-b border-neutral-600 flex items-center justify-between">
        <div className="flex items-center">
          <ChartBarIcon className="h-5 w-5 text-white mr-2" />
          <span className="text-white font-medium">Poker Analysis</span>
        </div>
        <button
          onClick={() => setSelectedHand(null)}
          className="flex items-center px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm"
        >
          <ArrowPathIcon className="h-4 w-4 mr-1" />
          Reset
        </button>
      </div>

      {/* Controls */}
      <div className="bg-neutral-800 p-3 border-b border-neutral-600 space-y-3">
        {/* Preset Dropdown */}
        <div>
          <label className="block text-white text-sm font-medium mb-1">Presets:</label>
          <div className="relative">
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              className="w-full bg-neutral-700 text-white rounded px-3 py-2 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="equity">Equity</option>
              <option value="action_frequency">Action Frequency</option>
              <option value="custom">Custom</option>
            </select>
            <ChevronDownIcon className="absolute right-2 top-2.5 h-4 w-4 text-neutral-400 pointer-events-none" />
          </div>
        </div>

        {/* Player Class Dropdown (only show for action frequency) */}
        {preset === 'action_frequency' && (
          <div>
            <label className="block text-white text-sm font-medium mb-1">Player Class:</label>
            <div className="relative">
              <select
                value={playerClass}
                onChange={(e) => setPlayerClass(e.target.value)}
                className="w-full bg-neutral-700 text-white rounded px-3 py-2 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="nit">Nit</option>
                <option value="joker">Joker</option>
                <option value="wild cat">Wild Cat</option>
                <option value="fat cat">Fat Cat</option>
                <option value="cowboy">Cowboy</option>
              </select>
              <ChevronDownIcon className="absolute right-2 top-2.5 h-4 w-4 text-neutral-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Custom Mode Controls */}
        {preset === 'custom' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-medium">Custom Colors</span>
              <button
                onClick={resetCustomColors}
                className="px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-500"
              >
                Reset All
              </button>
            </div>
            <div className="text-xs text-neutral-400">
              Click any hand to customize its color
            </div>
          </div>
        )}
      </div>

      {/* Analysis Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          
          {/* Mode Description */}
          <div className="bg-neutral-900 rounded-lg p-3">
            <h3 className="text-white font-medium mb-2 text-sm">
              {preset === 'equity' ? 'Hand Equity Guide' : 
               preset === 'action_frequency' ? `Action Frequency - ${playerClass}` : 
               'Custom Color Chart'}
            </h3>
            <div className="text-xs text-neutral-300">
              {preset === 'equity' 
                ? 'Shows win percentage against a random hand pre-flop'
                : preset === 'action_frequency'
                ? 'Shows likely action (R=Raise, C=Call, F=Fold) with percentage frequency'
                : 'Click any hand to customize its color. Create your own strategy chart!'
              }
            </div>
          </div>

          {/* 13x13 Hand Chart */}
          <div className="bg-neutral-900 rounded-lg p-4">
            <div className="grid grid-cols-13 gap-1 max-w-full">
              {ranks.map((rank1, row) => 
                ranks.map((rank2, col) => {
                  const handString = getHandString(row, col);
                  const displayValue = getDisplayValue(handString);
                  
                  return (
                    <button
                      key={`${row}-${col}`}
                      onClick={() => {
                        if (preset === 'custom') {
                          setColorPickerHand(handString);
                        } else {
                          setSelectedHand({
                            hand: handString,
                            equity: handEquity[handString] || 30,
                            strength: getHandStrength(handString),
                            actions: preset === 'action_frequency' ? playerStyles[playerClass][getHandStrength(handString)] : null
                          });
                        }
                      }}
                      className={`
                        aspect-square flex flex-col items-center justify-center text-xs font-medium
                        transition-all hover:scale-110 hover:z-10 relative rounded text-white
                        ${preset === 'custom' && !customColors[handString] ? getHandColor(handString) : ''}
                        ${preset !== 'custom' ? getHandColor(handString) : ''}
                        ${selectedHand?.hand === handString ? 'ring-2 ring-white scale-110 z-20' : ''}
                        ${colorPickerHand === handString ? 'ring-2 ring-blue-400 scale-110 z-20' : ''}
                      `}
                      style={preset === 'custom' && customColors[handString] ? hexToBackgroundStyle(customColors[handString]) : {}}
                    >
                      <div className="font-bold text-xs leading-none">{handString}</div>
                      <div className="text-xs opacity-90 leading-none">{displayValue}</div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Color Picker Modal for Custom Mode */}
          {colorPickerHand && preset === 'custom' && (
            <div className="bg-neutral-900 rounded-lg p-4 border-2 border-blue-500">
              <h3 className="text-white font-medium mb-3">Customize Color: {colorPickerHand}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Choose Color:</label>
                  <input
                    type="color"
                    value={customColors[colorPickerHand] || '#525252'}
                    onChange={(e) => handleColorChange(colorPickerHand, e.target.value)}
                    className="w-full h-12 rounded cursor-pointer border-2 border-neutral-600"
                  />
                </div>
                
                {/* Quick Color Presets */}
                <div>
                  <label className="block text-white text-sm font-medium mb-2">Quick Colors:</label>
                  <div className="grid grid-cols-6 gap-2">
                    {[
                      '#dc2626', // red-600
                      '#ea580c', // orange-600  
                      '#ca8a04', // yellow-600
                      '#16a34a', // green-600
                      '#2563eb', // blue-600
                      '#9333ea', // purple-600
                      '#db2777', // pink-600
                      '#525252', // gray-600
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() => handleColorChange(colorPickerHand, color)}
                        className="w-8 h-8 rounded border-2 border-neutral-600 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setColorPickerHand(null)}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-500 text-sm"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => {
                      const newColors = { ...customColors };
                      delete newColors[colorPickerHand];
                      setCustomColors(newColors);
                      setColorPickerHand(null);
                    }}
                    className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-500 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Selected Hand Details */}
          {selectedHand && preset !== 'custom' && (
            <div className="bg-neutral-900 rounded-lg p-4 border-2 border-blue-500">
              <h3 className="text-white font-medium mb-3">Hand Analysis: {selectedHand.hand}</h3>
              
              {preset === 'equity' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-neutral-800 rounded p-3 text-center">
                    <div className="text-neutral-400 text-xs uppercase tracking-wide">Equity</div>
                    <div className="text-white text-lg font-semibold">{selectedHand.equity.toFixed(1)}%</div>
                  </div>
                  <div className="bg-neutral-800 rounded p-3 text-center">
                    <div className="text-neutral-400 text-xs uppercase tracking-wide">Strength</div>
                    <div className="text-white text-lg font-semibold capitalize">{selectedHand.strength}</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-red-600 rounded p-3 text-center">
                      <div className="text-white text-xs uppercase tracking-wide">Raise</div>
                      <div className="text-white text-lg font-semibold">{selectedHand.actions.raise}%</div>
                    </div>
                    <div className="bg-blue-600 rounded p-3 text-center">
                      <div className="text-white text-xs uppercase tracking-wide">Call</div>
                      <div className="text-white text-lg font-semibold">{selectedHand.actions.call}%</div>
                    </div>
                    <div className="bg-gray-600 rounded p-3 text-center">
                      <div className="text-white text-xs uppercase tracking-wide">Fold</div>
                      <div className="text-white text-lg font-semibold">{selectedHand.actions.fold}%</div>
                    </div>
                  </div>
                  <div className="bg-neutral-800 rounded p-3">
                    <div className="text-neutral-400 text-xs uppercase tracking-wide mb-2">Player Style</div>
                    <div className="text-white text-sm capitalize">{playerClass}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Legend */}
          <div className="bg-neutral-900 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">
              {preset === 'equity' ? 'Equity Legend' : 
               preset === 'action_frequency' ? 'Action Legend' : 
               'Custom Chart'}
            </h3>
            {preset === 'equity' ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-600 rounded mr-2"></div>
                  <span className="text-white">80%+ Premium</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                  <span className="text-white">70-80% Excellent</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-orange-500 rounded mr-2"></div>
                  <span className="text-white">60-70% Strong</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
                  <span className="text-white">50-60% Good</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                  <span className="text-white">40-50% Playable</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-600 rounded mr-2"></div>
                  <span className="text-white">30-40% Weak</span>
                </div>
              </div>
            ) : preset === 'action_frequency' ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-600 rounded mr-2"></div>
                  <span className="text-white">Aggressive Raise</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                  <span className="text-white">Frequent Raise</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-orange-500 rounded mr-2"></div>
                  <span className="text-white">Moderate Raise</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                  <span className="text-white">Prefer Call</span>
                </div>
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-gray-600 rounded mr-2"></div>
                  <span className="text-white">Usually Fold</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-neutral-300">
                <div className="mb-2">Create your own personalized hand chart!</div>
                <div>• Click any hand to change its color</div>
                <div>• Use colors to represent your strategy</div>
                <div>• Build custom ranges for different positions</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .grid-cols-13 {
          grid-template-columns: repeat(13, minmax(0, 1fr));
        }
      `}</style>
    </>
  );
};

export default AnalysisPanel;