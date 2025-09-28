import React from "react";
import DraggableHUD from "./DraggableHud";
import HUDToggleButton from "./HUDToggleButton";

const PlayerSeat = ({
  positionClasses, // e.g. "absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
  marginTop,       // optional, e.g. "250px"
  playerName,
  stack,
  cards,
  isHUDVisible,
  onToggleHUD,
  hudStats,
  hands,
  renderCard,
  formatChips,
  isOpponent = false,
}) => {
  return (
    <div
      className={positionClasses}
      style={marginTop ? { marginTop } : undefined}
    >
      {/* Draggable HUD */}
      {isHUDVisible && (
        <DraggableHUD
          playerName={playerName}
          hands={hands}
          playerStats={hudStats}
        />
      )}

      <div className="text-center relative" style={{ width: "150px" }}>
        <div className="bg-neutral-800 rounded-lg p-3 border border-neutral-600">
          <p className="text-white font-semibold">{playerName}</p>
          <p className="text-neutral-300 text-sm">{formatChips(stack)} chips</p>

          <div className="flex space-x-1 mt-2 justify-center">
            {cards && cards.length > 0 ? (
              cards.map((card, i) => (
                <div key={i} className="w-8 h-12">
                  {renderCard(card)}
                </div>
              ))
            ) : (
              <>
                {renderCard(null, true)}
                {renderCard(null, true)}
              </>
            )}
          </div>
        </div>
      </div>
      <HUDToggleButton isVisible={isHUDVisible} onToggle={onToggleHUD} />
    </div>
  );
};

export default PlayerSeat;