export type CommandTarget = 'all' | 'leaders' | 'sessions';

export interface Command {
  id: string;
  content: string;
  icon?: string;
  senderId: string;
  senderName: string;
  senderInstrument: string;
  target: CommandTarget;
  timestamp: Date;
  expiresAt: Date;
}

export interface CommandTemplate {
  id: string;
  name: string;
  content: string;
  icon?: string;
  userId: string;
  isGlobal: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommandWithSender extends Command {
  senderInfo: {
    name: string;
    instrument: string;
    icon: string;
  };
}