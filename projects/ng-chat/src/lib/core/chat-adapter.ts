import { Observable } from 'rxjs';
import { Message } from './message';
import { ParticipantResponse } from './participant-response';
import { IChatParticipant } from './chat-participant';

export abstract class ChatAdapter {
  // ### Abstract adapter methods ###

  public abstract listFriends(): Observable<ParticipantResponse[]>;

  public abstract getMessageHistory(destinataryId: any): Observable<Message[]>;

  public abstract sendMessage(message: Message): void;

  public abstract finalizarAtendimento(participantId: string): void;

  public abstract pesquisarClientePorInscricao(
    inscricao: string,
    participantId: string,
  ): void;

  public abstract associarCliente(
    devedorId: string,
    participantId: string,
  ): void;

  public abstract desassociarCliente(participantId: string): void;

  public abstract enviarMensagemBoasVindas(participantId: string): void;

  // ### Adapter/Chat income/ingress events ###

  public onFriendsListChanged(
    participantsResponse: ParticipantResponse[],
  ): void {
    this.friendsListChangedHandler(participantsResponse);
  }

  public onMessageReceived(
    participant: IChatParticipant,
    message: Message,
  ): void {
    this.messageReceivedHandler(participant, message);
  }

  public onWindowStatusParticipantChanged(participant: IChatParticipant): void {
    this.windowStatusParticipantChangedHandler(participant);
  }

  public onPesquisaClientePorInscricaoReceived(
    cliente: any,
    participantId: string,
  ): void {
    this.pesquisaClientePorInscricaoReceivedHandler(cliente, participantId);
  }

  public onClienteAssociadoReceived(participantId: string): void {
    this.clienteAssociadoReceivedHandler(participantId);
  }

  public onClienteDesassociadoReceived(participantId: string): void {
    this.clienteDesassociadoReceivedHandler(participantId);
  }

  // Event handlers
  friendsListChangedHandler: (
    participantsResponse: ParticipantResponse[],
  ) => void = (participantsResponse: ParticipantResponse[]) => {};
  messageReceivedHandler: (
    participant: IChatParticipant,
    message: Message,
  ) => void = (participant: IChatParticipant, message: Message) => {};
  windowStatusParticipantChangedHandler: (
    participant: IChatParticipant,
  ) => void = (participant: IChatParticipant) => {};
  pesquisaClientePorInscricaoReceivedHandler: (
    cliente: any,
    participantId: string,
  ) => void = (cliente: any, participantId: string) => {};
  clienteAssociadoReceivedHandler: (participantId: string) => void = (
    participantId: string,
  ) => {};
  clienteDesassociadoReceivedHandler: (participantId: string) => void = (
    participantId: string,
  ) => {};
}
