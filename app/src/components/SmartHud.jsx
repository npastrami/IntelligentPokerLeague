import React, { useState } from 'react';

const SmartHUD = ({ playerStats, playerName = "Player", hands = 100 }) => {
  const [hoveredStat, setHoveredStat] = useState(null);

  // Default stats if none provided
  const defaultStats = {
    vpip: 22,
    pfr: 18,
    ats: 35,
    f2s: 68,
    '3b': 7,
    f3b: 75,
    cb: 72,
    fcb: 55,
    wtsd: 26,
    wsd: 54
  };

  const stats = playerStats || defaultStats;

  // Color coding logic
  const getStatColor = (statName, value) => {
    const ranges = {
      vpip: { red: [0, 15], green: [16, 25], orange: [26, 100] },
      pfr: { red: [0, 12], green: [13, 20], orange: [21, 100] },
      ats: { red: [0, 25], green: [26, 40], orange: [41, 100] },
      f2s: { red: [76, 100], green: [51, 75], orange: [0, 50] },
      '3b': { red: [0, 4], green: [5, 10], orange: [11, 100] },
      f3b: { red: [81, 100], green: [65, 80], orange: [0, 64] },
      cb: { red: [0, 55], green: [56, 75], orange: [76, 100] },
      fcb: { red: [0, 40], green: [41, 60], orange: [61, 100] },
      wtsd: { red: [0, 20], green: [21, 30], orange: [31, 100] },
      wsd: { red: [0, 45], green: [46, 55], orange: [56, 100] }
    };

    const range = ranges[statName];
    if (!range) return 'text-neutral-400';

    if (value >= range.red[0] && value <= range.red[1]) return 'text-red-400';
    if (value >= range.green[0] && value <= range.green[1]) return 'text-green-400';
    if (value >= range.orange[0] && value <= range.orange[1]) return 'text-yellow-400';

    return 'text-neutral-400';
  };

  // Full stat names for tooltips
  const getStatInfo = (statName) => {
    const info = {
      vpip: { name: 'Voluntarily Put $ In Pot', desc: 'How often they play hands preflop' },
      pfr: { name: 'Pre-Flop Raise', desc: 'How often they raise preflop' },
      ats: { name: 'Attempt To Steal', desc: 'Steal attempts from BTN/CO/SB' },
      f2s: { name: 'Fold To Steal', desc: 'How often they fold to steal attempts' },
      '3b': { name: '3-Bet Frequency', desc: 'How often they 3-bet preflop' },
      f3b: { name: 'Fold To 3-Bet', desc: 'How often they fold to 3-bets' },
      cb: { name: 'Continuation Bet', desc: 'C-bet frequency on flop as PFR' },
      fcb: { name: 'Fold To C-Bet', desc: 'How often they fold to c-bets' },
      wtsd: { name: 'Went To Showdown', desc: 'How often they reach showdown' },
      wsd: { name: 'Won $ At Showdown', desc: 'Win rate at showdown' }
    };
    return info[statName] || { name: statName, desc: 'Poker statistic' };
  };

  const StatItem = ({ statName, value }) => {
    const colorClass = getStatColor(statName, value);
    const { name, desc } = getStatInfo(statName);
    const isHovered = hoveredStat === statName;

    return (
      <div 
        className="relative flex flex-col items-center justify-center p-1 bg-neutral-800 bg-opacity-90 rounded border border-neutral-600 min-w-[32px] h-12 cursor-help"
        onMouseEnter={() => setHoveredStat(statName)}
        onMouseLeave={() => setHoveredStat(null)}
      >
        <div className="text-[9px] text-neutral-400 uppercase font-semibold">
          {statName === '3b' ? '3B' : statName.toUpperCase()}
        </div>
        <div className={`text-sm font-bold ${colorClass} leading-tight`}>
          {value}
        </div>
        
        {/* Tooltip */}
        {isHovered && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
            <div className="bg-neutral-900 border border-neutral-600 rounded-lg p-3 shadow-lg min-w-[200px]">
              <div className="text-white font-semibold text-sm mb-1">{name}</div>
              <div className="text-neutral-300 text-xs mb-2">{desc}</div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-neutral-400">Value:</span>
                <span className={`font-bold ${colorClass}`}>{value}%</span>
              </div>
              <div className="flex justify-between items-center text-xs mt-1">
                <span className="text-neutral-400">Hands:</span>
                <span className="text-neutral-300">{hands}</span>
              </div>
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-neutral-600"></div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative z-10 bg-neutral-900 bg-opacity-95 border border-neutral-700 rounded-lg p-2 font-mono text-xs shadow-lg pointer-events-auto">
      {/* Player Header */}
      <div className="text-center mb-2 px-1">
        <div className="text-white font-semibold text-xs truncate">{playerName}</div>
        <div className="text-neutral-400 text-[10px]">{hands}h</div>
      </div>
      
      {/* Stats Grid - 5 columns, 2 rows */}
      <div className="grid grid-cols-5 gap-1 mb-1">
        <StatItem statName="vpip" value={stats.vpip} />
        <StatItem statName="pfr" value={stats.pfr} />
        <StatItem statName="ats" value={stats.ats} />
        <StatItem statName="f2s" value={stats.f2s} />
        <StatItem statName="3b" value={stats['3b']} />
      </div>
      
      <div className="grid grid-cols-5 gap-1">
        <StatItem statName="f3b" value={stats.f3b} />
        <StatItem statName="cb" value={stats.cb} />
        <StatItem statName="fcb" value={stats.fcb} />
        <StatItem statName="wtsd" value={stats.wtsd} />
        <StatItem statName="wsd" value={stats.wsd} />
      </div>
    </div>
  );
};

export default SmartHUD;