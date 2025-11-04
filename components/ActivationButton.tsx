import React from 'react';
import { AppState } from '../types';
import { StopIcon } from './Icons';

interface CentralOrbProps {
  appState: AppState;
  isMuted: boolean;
}

const CentralOrb: React.FC<CentralOrbProps> = ({ appState, isMuted }) => {
  const isListeningOrProcessing = appState === AppState.LISTENING || appState === AppState.PROCESSING || appState === AppState.ACTIVATING;
  const isSpeaking = appState === AppState.SPEAKING;
  const isActive = isListeningOrProcessing || isSpeaking;

  const showListeningAnimation = isListeningOrProcessing && !isMuted;
  const showSpeakingAnimation = isSpeaking && !isMuted;
  const showIdlePulse = !isActive || isMuted;

  return (
    <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center cursor-pointer">
      <style>{`
        @keyframes ripple-inside {
          from { transform: scale(0.1); opacity: 0.75; }
          to { transform: scale(1); opacity: 0; }
        }
        .animate-ripple-inside {
          animation: ripple-inside 2s infinite cubic-bezier(0.25, 0.46, 0.45, 0.94);
          border-radius: 9999px; position: absolute; inset: 0;
        }

        @keyframes pulse-idle {
          0%, 100% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.05); opacity: 0.7; }
        }

        @keyframes speaking-arc {
          0% { transform: rotate(0deg) scale(0.9); opacity: 1; }
          100% { transform: rotate(360deg) scale(1.1); opacity: 0; }
        }
      `}</style>

      {/* Main Orb Container */}
      <div
        className={`absolute inset-0 rounded-full transition-colors duration-500 ease-in-out ${
          isMuted ? 'bg-red-900/50' : isActive ? 'bg-green-900/50' : 'bg-blue-900/50'
        }`}
      >
        {/* Inner static circle for IDLE/MUTED state with pulse */}
        {showIdlePulse && (
          <div
            className={`absolute inset-[30%] rounded-full transition-opacity duration-500 ease-in-out ${
              isMuted ? 'bg-red-500/60' : 'bg-blue-500/60'
            } animate-[pulse-idle_4s_ease-in-out_infinite]`}
          />
        )}

        {/* Animated ripples for LISTENING/PROCESSING state */}
        {showListeningAnimation && (
          <div className="absolute inset-0">
            <div
              className="animate-ripple-inside"
              style={{ borderColor: 'rgba(52, 211, 153, 0.7)', borderWidth: '2px', animationDelay: '0s' }}
            />
            <div
              className="animate-ripple-inside"
              style={{ borderColor: 'rgba(52, 211, 153, 0.7)', borderWidth: '2px', animationDelay: '1s' }}
            />
          </div>
        )}
        
        {/* Animated arcs for SPEAKING state */}
        {showSpeakingAnimation && (
            <div className="absolute inset-0">
                <div 
                    className="absolute inset-[10%] rounded-full border-4 border-green-400" 
                    style={{ 
                        animation: `speaking-arc 2s cubic-bezier(0.6, 0, 0.4, 1) infinite`,
                        clipPath: 'polygon(0% 0%, 100% 0%, 100% 50%, 0% 50%)'
                    }}
                />
                <div 
                    className="absolute inset-[10%] rounded-full border-4 border-green-400" 
                    style={{ 
                        animation: `speaking-arc 2s cubic-bezier(0.6, 0, 0.4, 1) infinite`,
                        animationDelay: '1s',
                        clipPath: 'polygon(0% 50%, 100% 50%, 100% 100%, 0% 100%)'
                    }}
                />
            </div>
        )}
      </div>

      {/* Glassy border effect */}
      <div className={`absolute inset-0 rounded-full border-2 transition-colors duration-500 ease-in-out ${
          isMuted ? 'border-red-400/30' : isActive ? 'border-green-400/30' : 'border-blue-400/30'
      }`} style={{ boxShadow: 'inset 0 0 10px rgba(255, 255, 255, 0.1)'}} />

      {/* Stop Icon Overlay */}
      <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ease-in-out ${isSpeaking && !isMuted ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <StopIcon className="w-16 h-16 text-white/80" />
      </div>
    </div>
  );
};

export default CentralOrb;