import React from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const HUDToggleButton = ({ isVisible, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className={`absolute -top-2 -left-3 z-40 bg-gray-600 hover:bg-gray-500 text-white p-2 rounded-full border border-gray-400 transition-all duration-200 shadow-lg`}
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