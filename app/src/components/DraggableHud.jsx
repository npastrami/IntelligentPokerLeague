import React, { useState, useRef, useEffect } from 'react';
import SmartHUD from './SmartHud';

const DraggableHUD = ({ playerName, hands, playerStats }) => {
  const [position, setPosition] = useState({ x: -240, y: -100 }); // Initial position
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const hudRef = useRef(null);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  return (
    <div
      ref={hudRef}
      className="absolute z-50 cursor-move select-none"
      style={{
        left: position.x,
        top: position.y,
        width: '200px'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className={`${isDragging ? 'opacity-80' : 'opacity-100'} transition-opacity`}>
        <SmartHUD 
          playerName={playerName}
          hands={hands}
          playerStats={playerStats}
        />
      </div>
    </div>
  );
};

export default DraggableHUD;