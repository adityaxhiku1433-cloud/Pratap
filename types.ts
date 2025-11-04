export enum AppState {
  IDLE,
  ACTIVATING,
  LISTENING,
  PROCESSING,
  SPEAKING,
  ERROR,
  ENDED,
}

export interface GroundingSource {
  uri: string;
  title: string;
  type: 'web' | 'map';
}

export interface ConversationTurn {
  user: string;
  model: string;
}