import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleGenAI, FunctionCall, GenerateContentResponse, Modality } from '@google/genai';
import { useLiveConversation } from './hooks/useLiveConversation';
import CentralOrb from './components/ActivationButton';
import TopStatusBar from './components/Waveform';
import { AppState, ConversationTurn } from './types';
import { allTools } from './services/geminiTools';
import { MicrophoneIcon, CloseIcon, CCIcon, CopyIcon, CheckIcon, BellIcon, MutedMicrophoneIcon, TrashIcon, SettingsIcon } from './components/Icons';
import BackgroundAnimation from './components/BackgroundAnimation';
import { decode, decodeAudioData } from './hooks/useAudioUtils';
import Logo from './components/Logo';
import TypingIndicator from './components/TypingIndicator';


// TranscriptDisplay Component defined inside App.tsx
interface TranscriptDisplayProps {
  isVisible: boolean;
  history: ConversationTurn[];
  currentUserTranscript: string;
  currentModelTranscript: string;
  onClose: () => void;
  onClear: () => void;
}

const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ isVisible, history, currentUserTranscript, currentModelTranscript, onClose, onClear }) => {
  const endOfMessagesRef = useRef<null | HTMLDivElement>(null);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, currentUserTranscript, currentModelTranscript]);
  
  const handleCopy = () => {
    const transcriptText = history
      .map(turn => `User: ${turn.user || '(No speech detected)'}\nModel: ${turn.model || '(No speech detected)'}`)
      .join('\n\n');

    navigator.clipboard.writeText(transcriptText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
    }).catch(err => {
        console.error("Failed to copy transcript: ", err);
    });
  };

  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-20 flex flex-col p-4 text-white">
      <div className="flex-shrink-0 flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Conversation Transcript</h2>
        <div className="flex items-center space-x-2">
            <button onClick={handleCopy} className="p-2 rounded-full hover:bg-white/10 transition-all duration-200 hover:scale-110" title="Copy transcript">
                {isCopied ? <CheckIcon className="w-6 h-6 text-green-400" /> : <CopyIcon className="w-6 h-6" />}
            </button>
            <button onClick={onClear} className="p-2 rounded-full hover:bg-white/10 transition-all duration-200 hover:scale-110" title="Clear history">
                <TrashIcon className="w-6 h-6" />
            </button>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-all duration-200 hover:scale-110">
                <CloseIcon className="w-6 h-6" />
            </button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto pr-2 space-y-4">
        {history.map((turn, index) => (
          <React.Fragment key={index}>
            {turn.user && (
              <div className="flex justify-end">
                <p className="bg-blue-600/50 p-3 rounded-xl max-w-xs md:max-w-md">{turn.user}</p>
              </div>
            )}
            {turn.model && (
              <div className="flex justify-start">
                <p className="bg-gray-700/50 p-3 rounded-xl max-w-xs md:max-w-md">{turn.model}</p>
              </div>
            )}
          </React.Fragment>
        ))}
        {/* Live transcripts */}
        {currentUserTranscript && (
          <div className="flex justify-end">
            <p className="bg-blue-600/30 p-3 rounded-xl max-w-xs md:max-w-md opacity-75">{currentUserTranscript}</p>
          </div>
        )}
        {currentModelTranscript && (
          <div className="flex justify-start">
            <p className="bg-gray-700/30 p-3 rounded-xl max-w-xs md:max-w-md opacity-75">{currentModelTranscript}</p>
          </div>
        )}
        <div ref={endOfMessagesRef} />
      </div>
    </div>
  );
};

// BottomControls Component defined inside App.tsx
const BottomControls = ({ onMicClick, onCloseClick, isMuted, isActive }: { onMicClick: () => void; onCloseClick: () => void; isMuted: boolean; isActive: boolean; }) => {
  return (
    <div className={`absolute bottom-8 w-full max-w-sm transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="w-full flex justify-center items-center space-x-20">
            <button 
                onClick={onMicClick} 
                className={`w-16 h-16 rounded-full flex items-center justify-center border border-white/20 backdrop-blur-sm transition-all duration-200 hover:scale-105 ${isMuted ? 'bg-red-900/50 hover:bg-red-800/50' : 'bg-white/10 hover:bg-white/20'}`}
                title={isMuted ? 'Unmute' : 'Mute'}
            >
                {isMuted ? <MutedMicrophoneIcon className="w-8 h-8 text-white" /> : <MicrophoneIcon className="w-8 h-8 text-white" />}
            </button>
            <button 
                onClick={onCloseClick} 
                className="w-16 h-16 rounded-full flex items-center justify-center border border-white/20 backdrop-blur-sm bg-red-600/80 hover:bg-red-500 transition-all duration-200 hover:scale-105"
                title="End Session"
            >
                <CloseIcon className="w-8 h-8 text-white" />
            </button>
        </div>
    </div>
  );
};


// Main App Component
const App = () => {
    const [apiKeySelected, setApiKeySelected] = useState<boolean>(false);
    const [checkingApiKey, setCheckingApiKey] = useState<boolean>(true);
    const [showTranscript, setShowTranscript] = useState(false);
    const [reminders, setReminders] = useState<{ id: number; text: string }[]>([]);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

    useEffect(() => {
        const checkKey = async () => {
            if (window.aistudio) {
                try {
                    const hasKey = await window.aistudio.hasSelectedApiKey();
                    setApiKeySelected(hasKey);
                } catch (e) {
                    console.error("Error checking for API key:", e);
                    setApiKeySelected(false); // Assume no key on error
                }
            } else {
                // Fallback for environments where aistudio is not available
                setApiKeySelected(!!process.env.API_KEY);
            }
            setCheckingApiKey(false);
        };
        checkKey();
    }, []);

    useEffect(() => {
        // Get user location for maps grounding
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
                (error) => {
                    console.error("Geolocation error:", error);
                }
            );
        }
    }, []);

    const handleSelectKey = async () => {
        if (window.aistudio) {
            await window.aistudio.openSelectKey();
            setApiKeySelected(true);
        }
    };
  
    const playReminder = useCallback(async (text: string) => {
        if (!process.env.API_KEY) return;
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Master, this is your reminder: ${text}` }] }],
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Charon' },
                },
              },
            },
          });
          const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            const audioBuffer = await decodeAudioData(decode(base64Audio), audioContext, 24000, 1);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();
          }
        } catch (e) {
          console.error("Failed to play reminder audio:", e);
        }
      }, []);

      const handleToolCall = useCallback(async (functionCalls: FunctionCall[]): Promise<string> => {
        if (!process.env.API_KEY) return "API Key not found.";
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        let toolResponseText = 'OK';
        for (const call of functionCalls) {
            const { name, args } = call;
            console.log(`Tool call: ${name}`, args);
    
            try {
                switch (name) {
                    case 'performGoogleSearch': {
                        if (!args.query) return "Missing search query.";
                        const response = await ai.models.generateContent({
                            model: "gemini-2.5-flash",
                            contents: args.query as string,
                            config: { tools: [{ googleSearch: {} }] },
                        });
                        toolResponseText = response.text;
                        break;
                    }
                    case 'findPlacesOnMap': {
                        if (!args.query) return "Missing map query.";
                        const response = await ai.models.generateContent({
                            model: "gemini-2.5-flash",
                            contents: args.query as string,
                            config: {
                                tools: [{ googleMaps: {} }],
                                toolConfig: userLocation ? { retrievalConfig: { latLng: userLocation } } : undefined,
                            },
                        });
                        toolResponseText = response.text;
                        break;
                    }
                    case 'performComplexTask': {
                        if (!args.prompt) return "Missing prompt for complex task.";
                        const response = await ai.models.generateContent({
                            model: "gemini-2.5-pro",
                            contents: args.prompt as string,
                            config: { thinkingConfig: { thinkingBudget: 8192 } },
                        });
                        toolResponseText = response.text;
                        break;
                    }
                    case 'performSimpleTask': {
                        if (!args.prompt) return "Missing prompt for simple task.";
                        const response = await ai.models.generateContent({
                            model: "gemini-2.5-flash",
                            contents: args.prompt as string,
                            config: { thinkingConfig: { thinkingBudget: 0 } },
                        });
                        toolResponseText = response.text;
                        break;
                    }
                    case 'setReminder': {
                        const { duration, unit, reminderText } = args;
                        const durationMs = (duration as number || 60) * (unit === 'minutes' ? 60000 : unit === 'hours' ? 3600000 : 1000);
                        const id = window.setTimeout(() => {
                            playReminder(reminderText as string);
                            setReminders(prev => prev.filter(r => r.id !== id));
                        }, durationMs);
                        setReminders(prev => [...prev, { id, text: reminderText as string }]);
                        toolResponseText = `Reminder set for ${duration} ${unit}.`;
                        break;
                    }
                    case 'getCurrentTime':
                        toolResponseText = `The current time is ${new Date().toLocaleTimeString()}.`;
                        break;
                    case 'setReminderAtTime': {
                        const { time, reminderText } = args;
                        toolResponseText = `I've set a reminder for you at ${time}.`;
                        break;
                    }
                    case 'openApplication':
                        toolResponseText = `I will try to open ${args.appName} now.`;
                        break;
                    default:
                        toolResponseText = `I'm not able to do that right now.`;
                }
            } catch (e) {
                console.error(`Error executing tool ${name}:`, e);
                toolResponseText = `Sorry, Master, I encountered an error while trying to do that. Please try again.`;
            }
        }
        return toolResponseText;
    }, [playReminder, userLocation]);
  
    const { 
      appState, startSession, stopSession, error, sessionDuration, 
      conversationHistory, userTranscript, modelTranscript, 
      isMuted, toggleMute, clearConversationHistory, interrupt 
    } = useLiveConversation({ 
        tools: allTools, 
        onToolCall: handleToolCall, 
        onApiKeyError: () => setApiKeySelected(false) 
    });
  
    const isActive = useMemo(() => appState !== AppState.IDLE && appState !== AppState.ENDED && appState !== AppState.ERROR, [appState]);
  
    const handleOrbClick = useCallback(() => {
      if (appState === AppState.SPEAKING || appState === AppState.PROCESSING) {
        interrupt();
      } else if (!isActive) {
        startSession();
      }
    }, [appState, isActive, startSession, interrupt]);
  
    const getStatusText = useCallback(() => {
      switch (appState) {
          case AppState.IDLE: return "Tap to start";
          case AppState.ACTIVATING: return "Activating...";
          case AppState.LISTENING: return isMuted ? "Muted" : "Listening...";
          case AppState.PROCESSING: return "Thinking...";
          case AppState.SPEAKING: return "Speaking...";
          case AppState.ENDED: return "Session ended";
          case AppState.ERROR: return "Error";
          default: return "";
      }
    }, [appState, isMuted]);
  
    if (checkingApiKey) {
        return (
            <div className="w-full h-screen flex flex-col items-center justify-center text-white text-center p-4 bg-black">
                <Logo appState={AppState.IDLE} />
                <p className="mt-4 text-lg">Initializing...</p>
            </div>
        );
    }

    if (!apiKeySelected) {
        return (
            <div className="w-full h-screen flex flex-col items-center justify-center text-white text-center p-4 bg-black">
                <BackgroundAnimation />
                <div className="relative z-10 flex flex-col items-center">
                    <Logo appState={AppState.IDLE} />
                    <h1 className="text-3xl font-bold my-4">Welcome to Veda</h1>
                    <p className="max-w-md mb-6">To start your conversation, please select a Gemini API key. This enables Veda to access powerful AI capabilities.</p>
                    <button 
                        onClick={handleSelectKey}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 text-lg shadow-lg hover:shadow-blue-500/50"
                    >
                        Select API Key
                    </button>
                    <p className="text-xs text-gray-400 mt-4 max-w-sm">
                        By using this service, you agree to the terms and conditions. Standard API usage fees may apply. 
                        For more details, please review the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300">billing documentation</a>.
                    </p>
                </div>
            </div>
        );
    }
  
    return (
      <main className="w-full h-screen bg-black overflow-hidden relative text-white flex flex-col items-center justify-center font-sans">
        <BackgroundAnimation />
        <Logo appState={appState} />
  
        <TopStatusBar isVisible={appState === AppState.ENDED} duration={sessionDuration} />
  
        <div className="absolute top-4 right-4 z-30 flex flex-col items-end space-y-2">
          {reminders.map(r => (
              <div key={r.id} className="bg-purple-800/80 backdrop-blur-md rounded-lg p-3 text-sm flex items-center space-x-2 border border-white/10 shadow-lg">
                  <BellIcon className="w-5 h-5 text-purple-300" />
                  <span>{r.text}</span>
              </div>
          ))}
        </div>
  
        <TranscriptDisplay 
          isVisible={showTranscript}
          history={conversationHistory}
          currentUserTranscript={userTranscript}
          currentModelTranscript={modelTranscript}
          onClose={() => setShowTranscript(false)}
          onClear={clearConversationHistory}
        />
        
        <div className="flex flex-col items-center justify-center flex-grow relative z-10 w-full px-4">
            <div className="w-full flex-grow flex flex-col items-center justify-center">
                {/* Model's live transcript */}
                <div className="w-full max-w-4xl flex-grow-[2] flex items-end justify-center pb-8">
                    <p className={`transition-opacity duration-500 text-center text-2xl md:text-3xl text-gray-200 font-light ${isActive && modelTranscript ? 'opacity-100' : 'opacity-0'}`} style={{ textShadow: '0 2px 5px rgba(0,0,0,0.7)' }}>
                        {modelTranscript}
                    </p>
                </div>

                {/* Central orb */}
                <div onClick={handleOrbClick} className="flex-shrink-0">
                    <CentralOrb appState={appState} isMuted={isMuted} />
                </div>
                
                {/* User's live transcript and status */}
                <div className="w-full max-w-4xl flex-grow flex flex-col items-center justify-start pt-4">
                    <div className="h-20 flex items-center justify-center">
                        <p className={`transition-opacity duration-500 text-center text-xl md:text-2xl text-blue-300 ${isActive && userTranscript ? 'opacity-100' : 'opacity-0'}`} style={{ textShadow: '0 2px 5px rgba(0,0,0,0.7)' }}>
                            {userTranscript}
                        </p>
                    </div>
                    <div className="h-10 flex items-center justify-center text-center text-gray-300 text-lg">
                        {appState === AppState.LISTENING && userTranscript && !isMuted ? <TypingIndicator /> : <span>{getStatusText()}</span>}
                    </div>
                    {error && <p className="text-red-400 mt-2 max-w-md text-center">{error}</p>}
                </div>
            </div>
            
            <BottomControls onMicClick={toggleMute} onCloseClick={stopSession} isMuted={isMuted} isActive={isActive} />

            {/* Transcript button */}
            {isActive && (
                <button 
                    onClick={() => setShowTranscript(true)} 
                    className="absolute bottom-8 left-8 w-14 h-14 rounded-full flex items-center justify-center border border-white/20 backdrop-blur-sm bg-white/10 hover:bg-white/20 transition-all duration-200 hover:scale-105"
                    title="Show Transcript"
                >
                    <CCIcon className="w-7 h-7" />
                </button>
            )}
        </div>
      </main>
    );
  };

export default App;