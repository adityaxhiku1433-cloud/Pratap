

import { FunctionDeclaration, Type } from '@google/genai';

export const performGoogleSearch: FunctionDeclaration = {
  name: 'performGoogleSearch',
  description: 'Gets up-to-date information from Google Search for queries about recent events, news, or trending information.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'The search query.' },
    },
    required: ['query'],
  },
};

export const findPlacesOnMap: FunctionDeclaration = {
  name: 'findPlacesOnMap',
  description: 'Finds places on Google Maps based on a query and optional location. Useful for geography or place-related questions.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'The query to search for on Google Maps (e.g., "good italian restaurants").' },
    },
    required: ['query'],
  },
};

export const performComplexTask: FunctionDeclaration = {
    name: 'performComplexTask',
    description: 'Handles complex queries requiring advanced reasoning, coding, math, or STEM knowledge using a powerful model with an extended thinking budget.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: 'The complex prompt or question to process.' },
      },
      required: ['prompt'],
    },
  };

  export const performSimpleTask: FunctionDeclaration = {
    name: 'performSimpleTask',
    description: 'Handles simple tasks that require a very fast, low-latency response, such as quick summarizations or simple Q&A.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: 'The simple prompt for a quick task.' },
      },
      required: ['prompt'],
    },
  };

export const setReminder: FunctionDeclaration = {
  name: 'setReminder',
  description: 'Sets a reminder for the user. The AI will speak the reminder text back to the user after the specified duration. The user can specify the duration in seconds, minutes, or hours.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      duration: { type: Type.NUMBER, description: 'The amount of time until the reminder.' },
      unit: { type: Type.STRING, description: 'The unit of time for the duration (e.g., "seconds", "minutes", "hours").' },
      reminderText: { type: Type.STRING, description: 'The text of the reminder that the AI should speak.' },
    },
    required: ['duration', 'unit', 'reminderText'],
  },
};

export const getCurrentTime: FunctionDeclaration = {
  name: 'getCurrentTime',
  description: 'Gets the current local time.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
    required: [],
  },
};

export const setReminderAtTime: FunctionDeclaration = {
  name: 'setReminderAtTime',
  description: 'Sets a reminder for the user at a specific time of day. The AI will speak the reminder text back to the user at the specified time.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      time: { type: Type.STRING, description: 'The time for the reminder in 24-hour HH:MM format (e.g., "14:30" for 2:30 PM).' },
      reminderText: { type: Type.STRING, description: 'The text of the reminder that the AI should speak.' },
    },
    required: ['time', 'reminderText'],
  },
};

export const openApplication: FunctionDeclaration = {
  name: 'openApplication',
  description: 'Opens an application installed on the user\'s device.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      appName: { type: Type.STRING, description: 'The name of the application to open (e.g., "Spotify", "Calculator", "VS Code").' },
    },
    required: ['appName'],
  },
};

export const allTools: FunctionDeclaration[] = [
    performGoogleSearch,
    findPlacesOnMap,
    performComplexTask,
    performSimpleTask,
    setReminder,
    getCurrentTime,
    setReminderAtTime,
    openApplication,
];