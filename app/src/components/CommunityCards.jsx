import React from "react";

const CommunityCards = ({ pot, boardCards, renderCard, formatChips }) => {
  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
      <div className="text-center">
        {/* Pot Display */}
        <p className="text-white font-semibold mb-2">
          Pot: {formatChips(pot)}
        </p>

        {/* Board Cards */}
        <div className="flex space-x-2 justify-center">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <div key={`flop-${i}`}>
                {renderCard(boardCards?.[i])}
              </div>
            ))}

          <div>{renderCard(boardCards?.[3])}</div>
          <div>{renderCard(boardCards?.[4])}</div>
        </div>

        {/* Stage Labels */}
        <div className="flex justify-center space-x-8 mt-1 text-xs text-neutral-300">
          <span>Flop</span>
          <span>Turn</span>
          <span>River</span>
        </div>
      </div>
    </div>
  );
};

export default CommunityCards;
