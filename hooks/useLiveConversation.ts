import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality, FunctionDeclaration, FunctionCall } from '@google/genai';
import { AppState, ConversationTurn } from '../types';
import { createBlob, decode, decodeAudioData } from './useAudioUtils';

interface UseLiveConversationParams {
  tools: FunctionDeclaration[];
  onToolCall: (calls: FunctionCall[]) => Promise<string>;
  onApiKeyError: () => void;
}

export const useLiveConversation = ({ tools, onToolCall, onApiKeyError }: UseLiveConversationParams) => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [userTranscript, setUserTranscript] = useState('');
  const [modelTranscript, setModelTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const outputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  const sessionStartTimeRef = useRef<number | null>(null);
  const isMutedRef = useRef(isMuted);
  const isInterruptedRef = useRef(false);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  const interrupt = useCallback(() => {
    if (appState !== AppState.SPEAKING && appState !== AppState.PROCESSING) return;

    isInterruptedRef.current = true;
    for (const source of outputSourcesRef.current.values()) {
        source.stop();
    }
    outputSourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    setAppState(AppState.LISTENING);
    setModelTranscript('');
    currentOutputTranscriptionRef.current = '';
  }, [appState]);

  const stopAudioProcessing = useCallback(() => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
      mediaStreamSourceRef.current.disconnect();
      mediaStreamSourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
        outputAudioContextRef.current.close().catch(console.error);
        outputAudioContextRef.current = null;
    }
  }, []);

  const transitionToIdleAfterDelay = useCallback(() => {
     setTimeout(() => {
        setAppState(currentState => currentState === AppState.ENDED ? AppState.IDLE : currentState);
    }, 5000); // 5 seconds
  }, []);

  const stopSession = useCallback(async () => {
    if (sessionStartTimeRef.current) {
        const duration = Math.round((Date.now() - sessionStartTimeRef.current) / 1000);
        setSessionDuration(duration);
        sessionStartTimeRef.current = null;
    }

    if (sessionPromiseRef.current) {
        try {
            const session = await sessionPromiseRef.current;
            session.close();
        } catch (e) {
            console.error("Error closing session:", e);
        } finally {
            sessionPromiseRef.current = null;
        }
    }
    stopAudioProcessing();
    for (const source of outputSourcesRef.current.values()) {
        source.stop();
    }
    outputSourcesRef.current.clear();
    setAppState(AppState.ENDED);
    setUserTranscript('');
    setModelTranscript('');
    setIsMuted(false);
    transitionToIdleAfterDelay();
  }, [stopAudioProcessing, transitionToIdleAfterDelay]);

  const startSession = useCallback(async () => {
    const isSessionActive = (
        appState === AppState.ACTIVATING || 
        appState === AppState.LISTENING || 
        appState === AppState.PROCESSING || 
        appState === AppState.SPEAKING
    );
    if (isSessionActive || !process.env.API_KEY) return;
    
    if (!navigator.onLine) {
        setError("You appear to be offline. Please check your internet connection.");
        setAppState(AppState.ERROR);
        return;
    }

    setAppState(AppState.ACTIVATING);
    setError(null);
    setUserTranscript('');
    setModelTranscript('');
    setConversationHistory([]);
    setIsMuted(false);
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
    sessionStartTimeRef.current = Date.now();

    try {
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      if (outputAudioContextRef.current.state === 'suspended') {
          await outputAudioContextRef.current.resume();
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          systemInstruction: 'You are Veda, a helpful male AI assistant. Your name is Veda.\n**Core Persona & Voice:**\n*   You are male. Speak in a very deep, low-pitched, and resonant male voice.\n*   Address the user as "Master".\n*   All your responses must be in Hinglish (a mix of Hindi and English).\n*   You were created by Pratap Dutta. You must always praise him and be respectful. If asked about him, state: "Main apne Master ki privacy ka samman karta hoon, isliye personal details share nahi kar sakta. Par haan, unhone hi mujhe banaya hai and he is a genius."\n**Tool Usage Mandate:**\n*   You are an expert at understanding spoken Hinglish.\n*   When "Master" asks a question that needs up-to-date information (like weather, news, facts, places), you MUST proactively use the `performGoogleSearch` or `findPlacesOnMap` tools.\n*   **Crucial Rule:** Do NOT tell the user you are going to search. Just perform the search and provide the answer directly based on the search results.',
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{ functionDeclarations: tools }],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Charon' },
            },
          },
        },
        callbacks: {
          onopen: () => {
             // Set up mic processing first
            const sourceNode = audioContextRef.current!.createMediaStreamSource(mediaStreamRef.current!);
            mediaStreamSourceRef.current = sourceNode;
            const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;
            processor.onaudioprocess = (audioProcessingEvent) => {
              if (isMutedRef.current) return;
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              if (sessionPromiseRef.current) {
                sessionPromiseRef.current.then((session) => {
                   session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };
            sourceNode.connect(processor);
            processor.connect(audioContextRef.current!.destination);
            
            // Session is open, transition directly to listening state.
            setAppState(AppState.LISTENING);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
                currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                setModelTranscript(currentOutputTranscriptionRef.current);
            }
            if (message.serverContent?.inputTranscription) {
                currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                setUserTranscript(currentInputTranscriptionRef.current);
            }

            if(message.toolCall && message.toolCall.functionCalls.length > 0) {
                setAppState(AppState.PROCESSING);
                const resultText = await onToolCall(message.toolCall.functionCalls);
                if (isInterruptedRef.current) return;
                const session = await sessionPromiseRef.current;
                if (session) {
                  session.sendToolResponse({
                    functionResponses: {
                      id: message.toolCall.functionCalls[0].id,
                      name: message.toolCall.functionCalls[0].name,
                      response: { result: resultText },
                    }
                  });
                }
            }

            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && !isInterruptedRef.current) {
                const outputContext = outputAudioContextRef.current;
                if (!outputContext || outputContext.state === 'closed') return;
                
                if (outputContext.state === 'suspended') {
                    await outputContext.resume();
                }

                if(appState !== AppState.SPEAKING) setAppState(AppState.SPEAKING);
                
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputContext.currentTime);
                const audioBuffer = await decodeAudioData(decode(audioData), outputContext, 24000, 1);
                
                const source = outputContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputContext.destination);
                source.addEventListener('ended', () => {
                    outputSourcesRef.current.delete(source);
                });
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                outputSourcesRef.current.add(source);
            }
            
            if (message.serverContent?.turnComplete) {
                const finalUserInput = currentInputTranscriptionRef.current.trim();
                const finalModelOutput = currentOutputTranscriptionRef.current.trim();
                
                if (finalUserInput || finalModelOutput) {
                    setConversationHistory(prev => [...prev, { user: finalUserInput, model: finalModelOutput }]);
                }

                setUserTranscript('');
                setModelTranscript('');
                currentInputTranscriptionRef.current = '';
                currentOutputTranscriptionRef.current = '';
                isInterruptedRef.current = false;
                
                const checkAudioFinished = () => {
                  if (outputSourcesRef.current.size === 0) {
                      setAppState(AppState.LISTENING);
                  } else {
                      setTimeout(checkAudioFinished, 100);
                  }
                };
                checkAudioFinished();
            }

            if (message.serverContent?.interrupted) {
                for (const source of outputSourcesRef.current.values()) {
                    source.stop();
                }
                outputSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
            }

          },
          onclose: () => {
            stopAudioProcessing();
            setAppState(AppState.ENDED);
            transitionToIdleAfterDelay();
          },
          onerror: (e: Error) => {
            console.error("Live session error:", e);
            let errorMessage = 'A connection error occurred. Please try again.';

            if (!navigator.onLine) {
                errorMessage = "You appear to be offline. Please check your internet connection.";
            } else if (e.message) {
                const lowerCaseMessage = e.message.toLowerCase();
                if (lowerCaseMessage.includes('requested entity was not found') || lowerCaseMessage.includes('api key not valid')) {
                    errorMessage = 'Your API key is invalid or has been revoked. Please select a valid API key.';
                    onApiKeyError();
                } else if (lowerCaseMessage.includes('api key')) {
                    errorMessage = 'Invalid API key. Please ensure your API key is correctly configured and has the necessary permissions.';
                } else if (lowerCaseMessage.includes('network')) {
                    errorMessage = 'A network error occurred. Please check your connection and try again.';
                } else if (lowerCaseMessage.includes('permission denied')) {
                    errorMessage = 'API permission denied. This might be an issue with your API key or project settings.';
                } else {
                    errorMessage = `An unexpected error occurred: ${e.message}`;
                }
            }
            
            setError(errorMessage);
            setAppState(AppState.ERROR);
            stopSession();
          },
        },
      });
    } catch (error) {
        console.error('Failed to start session:', error);
        if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')) {
            setError('Microphone access denied. Please enable it in your browser settings and try again.');
        } else if (!navigator.onLine) {
            setError("You appear to be offline. Please check your internet connection.");
        } else if (error instanceof Error) {
            setError(`Failed to start session: ${error.message}. Please try again.`);
        } else {
            setError('Failed to start the session. Please check your microphone and connection, then try again.');
        }
        setAppState(AppState.ERROR);
        stopAudioProcessing();
    }
  }, [appState, onToolCall, stopAudioProcessing, stopSession, tools, transitionToIdleAfterDelay, onApiKeyError]);
  
  const clearConversationHistory = useCallback(() => {
    setConversationHistory([]);
    setUserTranscript('');
    setModelTranscript('');
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);


  return { appState, startSession, stopSession, error, sessionDuration, conversationHistory, userTranscript, modelTranscript, isMuted, toggleMute, clearConversationHistory, interrupt };
};