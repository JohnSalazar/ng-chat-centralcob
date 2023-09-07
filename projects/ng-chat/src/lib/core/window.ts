import { Message } from './message';
import { User } from './user';
import { IChatParticipant } from './chat-participant';

export class Window {
  constructor(
    participant: IChatParticipant,
    isLoadingHistory: boolean,
    isCollapsed: boolean,
  ) {
    this.participant = participant;
    this.messages = [];
    this.isLoadingHistory = isLoadingHistory;
    this.hasFocus = false; // This will be triggered when the 'newMessage' input gets the current focus
    this.isCollapsed = isCollapsed;
    this.hasMoreMessages = false;
    this.historyPage = 0;
  }

  //public participant: IChatParticipant;
  public participant: User;
  public messages: Message[] = [];
  public newMessage?: string = '';

  // UI Behavior properties
  public isCollapsed?: boolean = false;
  public isLoadingHistory: boolean = false;
  public hasFocus: boolean = false;
  public hasMoreMessages: boolean = true;
  public historyPage: number = 0;
  public mostrarPesquisaCliente: boolean = false;
  public mostrarAssociarCliente: boolean = false;
  public mostrarDesassociarCliente: boolean = false;
  public mostrarFinalizarAtendimento: boolean = false;
  public inscricao?: string = '';
  public clienteNome?: string = '';
  public erroPesquisa?: string = '';
  public loadingPesquisa: boolean = false;
  public loadingAssociar: boolean = false;
  public loadingDesassociar: boolean = false;
  public devedorId?: string;
  public associado: boolean = false;
}
