import React from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const HUDToggleButton = ({ isVisible, onToggle, position = "bottom-right" }) => {
  const positionClasses = {
    "bottom-right": "absolute bottom-2 right-2",
    "bottom-left": "absolute bottom-2 left-2", 
    "top-right": "absolute top-2 right-2",
    "top-left": "absolute top-2 left-2"
  };

  return (
    <button
      onClick={onToggle}
      className={`${positionClasses[position]} z-40 bg-gray-600 hover:bg-gray-500 text-white p-2 rounded-full border border-gray-400 transition-all duration-200 shadow-lg`}
      title={isVisible ? "Hide HUD" : "Show HUD"}
    >
      {isVisible ? (
        <EyeSlashIcon className="h-4 w-4" />
      ) : (
        <EyeIcon className="h-4 w-4" />
      )}
    </button>
  );
};

export default HUDToggleButton;