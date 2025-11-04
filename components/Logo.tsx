
import React from 'react';
import { BrainIcon } from './Icons';
import { AppState } from '../types';

interface LogoProps {
  appState: AppState;
}

const Logo: React.FC<LogoProps> = ({ appState }) => {
  const isProcessing = appState === AppState.PROCESSING;

  return (
    <div className="absolute top-4 left-4 z-30 flex items-center space-x-3 pointer-events-none">
      <style>{`
        @keyframes pulse-logo-idle {
          0%, 100% { 
            transform: scale(1);
            filter: drop-shadow(0 0 3px rgba(100, 150, 255, 0.4));
          }
          50% { 
            transform: scale(1.05);
            filter: drop-shadow(0 0 6px rgba(100, 150, 255, 0.6));
          }
        }

        @keyframes pulse-logo-processing {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 4px rgba(52, 211, 153, 0.6));
          }
          50% {
            transform: scale(1.1);
            filter: drop-shadow(0 0 10px rgba(52, 211, 153, 1));
          }
        }
        .animate-logo-idle {
          animation: pulse-logo-idle 5s ease-in-out infinite;
        }
        .animate-logo-processing {
          animation: pulse-logo-processing 1.5s ease-in-out infinite;
        }
      `}</style>
      <div className={`transition-all duration-500 ${isProcessing ? 'animate-logo-processing' : 'animate-logo-idle'}`}>
        <BrainIcon className={`w-8 h-8 md:w-10 md:h-10 transition-colors duration-500 ${isProcessing ? 'text-green-300' : 'text-blue-300'}`} />
      </div>
       <span className="text-lg md:text-xl font-semibold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-gray-200 to-gray-400">
        Veda
      </span>
    </div>
  );
};

export default Logo;