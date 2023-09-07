import { ChatParticipantStatus } from './chat-participant-status.enum';
import { IChatParticipant } from './chat-participant';
import { ChatParticipantType } from './chat-participant-type.enum';

export class User implements IChatParticipant {
  public participantType!: ChatParticipantType;
  public id: any;
  public displayName!: string;
  public status!: ChatParticipantStatus;
  public avatar!: string | null;
  public email!: string;
  public code!: string;
  public empresaId!: string;
  public userId!: string;
}
