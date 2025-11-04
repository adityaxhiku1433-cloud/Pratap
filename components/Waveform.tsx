import React from 'react';
import { SoundWaveIcon, ThumbsUpIcon, ThumbsDownIcon } from './Icons';

interface TopStatusBarProps {
  isVisible: boolean;
  duration: number;
}

const TopStatusBar: React.FC<TopStatusBarProps> = ({ isVisible, duration }) => {

  return (
    <div className={`absolute top-4 left-1/2 -translate-x-1/2 w-11/12 max-w-md transition-all duration-500 ease-in-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-12'}`}>
      <div className="bg-gray-800/80 backdrop-blur-md rounded-xl p-3 flex items-center justify-between text-white shadow-lg border border-white/10">
        <div className="flex items-center space-x-3">
            <SoundWaveIcon className="w-5 h-5 text-gray-300" />
            <div>
                <p className="font-medium">Voice chat ended</p>
                <p className="text-xs text-gray-400">{duration}s</p>
            </div>
        </div>
        <div className="flex items-center space-x-2">
            <button className="p-2 rounded-full hover:bg-white/10 transition-all duration-200 hover:scale-110">
                <ThumbsUpIcon className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-full hover:bg-white/10 transition-all duration-200 hover:scale-110">
                <ThumbsDownIcon className="w-5 h-5" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default TopStatusBar;