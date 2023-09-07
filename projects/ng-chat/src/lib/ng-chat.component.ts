import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, EventEmitter, HostListener, Input, OnInit, Output, ViewChildren, ViewEncapsulation } from '@angular/core';
import { map } from 'rxjs';
import { ChatAdapter } from './core/chat-adapter';
import { IChatController } from './core/chat-controller';
import { IChatGroupAdapter } from './core/chat-group-adapter';
import { IChatOption } from './core/chat-option';
import { IChatParticipant } from './core/chat-participant';
import { ChatParticipantStatus } from './core/chat-participant-status.enum';
import { ChatParticipantType } from './core/chat-participant-type.enum';
import { DefaultFileUploadAdapter } from './core/default-file-upload-adapter';
import { IFileUploadAdapter } from './core/file-upload-adapter';
import { Group } from './core/group';
import { Localization, StatusDescription } from './core/localization';
import { Message } from './core/message';
import { MessageType } from './core/message-type.enum';
import { PagedHistoryChatAdapter } from './core/paged-history-chat-adapter';
import { ParticipantResponse } from './core/participant-response';
import { ScrollDirection } from './core/scroll-direction.enum';
import { Theme } from './core/theme.enum';
import { User } from './core/user';
import { Window } from "./core/window";

@Component({
  selector: 'ng-chat',
  templateUrl: './ng-chat.component.html',
    styleUrls: [
        'assets/icons.css',
        'assets/loading-spinner.css',
        'assets/ng-chat.component.default.css',
        'assets/themes/ng-chat.theme.default.scss',
        'assets/themes/ng-chat.theme.dark.scss'
    ],
    encapsulation: ViewEncapsulation.None
})
export class NgChat implements OnInit, IChatController {
  constructor(private _httpClient: HttpClient) {}

  // Exposes enums for the ng-template
  public ChatParticipantType = ChatParticipantType;
  public ChatParticipantStatus = ChatParticipantStatus;
  public MessageType = MessageType;

  private _isDisabled: boolean = false;

  get isDisabled(): boolean {
    return this._isDisabled;
  }

  @Input()
  set isDisabled(value: boolean) {
    this._isDisabled = value;

    if (value) {
      window.clearInterval(this.pollingIntervalWindowInstance);
    } else {
      this.activateFriendListFetch();
    }
  }

  @Input()
  public adapter: ChatAdapter | undefined;

  @Input()
  public groupAdapter!: IChatGroupAdapter;

  @Input()
  public userId: any;

  @Input()
  public isCollapsed: boolean = false;

  @Input()
  public maximizeWindowOnNewMessage: boolean = true;

  @Input()
  public pollFriendsList: boolean = false;

  @Input()
  public pollingInterval: number = 5000;

  @Input()
  public historyEnabled: boolean = true;

  @Input()
  public emojisEnabled: boolean = true;

  @Input()
  public linkfyEnabled: boolean = true;

  @Input()
  public audioEnabled: boolean = true;

  @Input()
  public searchEnabled: boolean = true;

  @Input()
  public audioSource: string =
    'https://www.centralcob.com.br/assets/notification.wav';

  @Input()
  public persistWindowsState: boolean = true;

  @Input()
  public title: string = 'Friends';

  @Input()
  public messagePlaceholder: string = 'Digite uma mensagem';

  @Input()
  public searchPlaceholder: string = 'Search';

  @Input()
  public browserNotificationsEnabled: boolean = true;

  @Input()
  public browserNotificationIconSource: string =
    'https://www.centralcob.com.br/assets/notification.png';

  @Input()
  public browserNotificationTitle: string = 'Nova mensagem de';

  @Input()
  public historyPageSize: number = 10;

  @Input()
  public localization: Localization | undefined;

  @Input()
  public hideFriendsList: boolean = false;

  @Input()
  public hideFriendsListOnUnsupportedViewport: boolean = true;

  @Input()
  public fileUploadUrl: string = '';

  @Input()
  public theme: Theme = Theme.Light;

  @Input()
  public customTheme: string = '';

  @Input()
  public messageDatePipeFormat: string = 'short';

  @Input()
  public showMessageDate: boolean = true;

  @Input()
  public isViewportOnMobileEnabled: boolean = false;

  @Output()
  public onParticipantClicked: EventEmitter<IChatParticipant> =
    new EventEmitter<IChatParticipant>();

  @Output()
  public onParticipantChatOpened: EventEmitter<IChatParticipant> =
    new EventEmitter<IChatParticipant>();

  @Output()
  public onParticipantChatClosed: EventEmitter<IChatParticipant> =
    new EventEmitter<IChatParticipant>();

  @Output()
  public onMessagesSeen: EventEmitter<Message[]> = new EventEmitter<
    Message[]
  >();

  private browserNotificationsBootstrapped: boolean = false;

  public hasPagedHistory: boolean = false;

  private statusDescription: StatusDescription = {
    online: 'Online',
    busy: 'Busy',
    away: 'Away',
    offline: 'Offline',
  };

  private audioFile: HTMLAudioElement | undefined;

  public searchInput: string = '';

  protected participants: IChatParticipant[] = [];

  protected participantsResponse: ParticipantResponse[] = [];

  private participantsInteractedWith: IChatParticipant[] = [];

  public currentActiveOption: IChatOption | undefined;

  protected selectedUsersFromFriendsList: User[] = [];

  private pollingIntervalWindowInstance: number = 0;

  public showFriendsListAction: boolean = true;

  public defaultWindowOptions(currentWindow: Window): IChatOption[] {
    if (
      this.groupAdapter &&
      currentWindow.participant.participantType == ChatParticipantType.User
    ) {
      return [
        {
          isActive: false,
          action: (chattingWindow: Window) => {
            this.showFriendsListAction = true;
            this.selectedUsersFromFriendsList =
              this.selectedUsersFromFriendsList.concat(
                chattingWindow.participant as User,
              );
          },
          validateContext: (participant: IChatParticipant) => {
            return participant.participantType == ChatParticipantType.User;
          },
          displayLabel: 'Adicionar pessoa',
        },
      ];
    }

    if (
      currentWindow.participant.participantType == ChatParticipantType.Client
    ) {
      var retorno = [
        {
          isActive: false,
          action: (chattingWindow: Window) => {
            this.showFriendsListAction = false;
            chattingWindow.mostrarFinalizarAtendimento = true;
          },
          validateContext: (participant: IChatParticipant) => {
            return participant.participantType == ChatParticipantType.Client;
          },
          displayLabel: 'Finalizar Atendimento',
        },
      ];

      if (!currentWindow.associado) {
        var opcao = {
          isActive: false,
          action: (chattingWindow: Window) => {
            this.showFriendsListAction = false;
            chattingWindow.mostrarPesquisaCliente = true;
          },
          validateContext: (participant: IChatParticipant) => {
            return participant.participantType == ChatParticipantType.Client;
          },
          displayLabel: 'Associar Cliente',
        };
        retorno.push(opcao);
        return retorno;
      }

      if (currentWindow.associado) {
        var opcao = {
          isActive: false,
          action: (chattingWindow: Window) => {
            this.showFriendsListAction = false;
            chattingWindow.mostrarDesassociarCliente = true;
          },
          validateContext: (participant: IChatParticipant) => {
            return participant.participantType == ChatParticipantType.Client;
          },
          displayLabel: 'Desassociar Cliente',
        };
        retorno.push(opcao);
        return retorno;
      }
    }

    return [];
  }

  private get localStorageKey(): string {
    return `ng-chat-users-${this.userId}`;
  }

  get filteredParticipants(): IChatParticipant[] {
    if (this.searchInput.length > 0) {
      return this.participants.filter((x) =>
        x.displayName.toUpperCase().includes(this.searchInput.toUpperCase()),
      );
    }

    return this.participants;
  }

  public windowSizeFactor: number = 320;

  public friendsListWidth: number = 262;

  private viewPortTotalArea: number = 0;

  public unsupportedViewport: boolean = false;

  public fileUploadersInUse: string[] = [];
  public fileUploadAdapter: IFileUploadAdapter | undefined;

  windows: Window[] = [];

  isBootstrapped: boolean = false;

  @ViewChildren('chatMessages') chatMessageClusters: any;

  @ViewChildren('chatWindowInput') chatWindowInputs: any;

  @ViewChildren('nativeFileInput') nativeFileInputs: ElementRef[] | undefined;

  ngOnInit() {
    this.bootstrapChat();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.viewPortTotalArea = event.target.innerWidth;

    this.NormalizeWindows();
  }

  private NormalizeWindows(): void {
    let maxSupportedOpenedWindows = Math.floor(
      (this.viewPortTotalArea -
        (!this.hideFriendsList ? this.friendsListWidth : 0)) /
        this.windowSizeFactor,
    );
    let difference = this.windows.length - maxSupportedOpenedWindows;

    if (difference >= 0) {
      this.windows.splice(this.windows.length - difference);
    }

    this.updateWindowsState(this.windows);

    this.unsupportedViewport = this.isViewportOnMobileEnabled
      ? false
      : this.hideFriendsListOnUnsupportedViewport &&
        maxSupportedOpenedWindows < 1;
  }

  private bootstrapChat(): void {
    let initializationException: any ;

    if (this.adapter != null && this.userId != null) {
      try {
        this.viewPortTotalArea = window.innerWidth;

        this.initializeTheme();
        this.initializeDefaultText();
        this.initializeBrowserNotifications();

        this.adapter.messageReceivedHandler = (participant, msg) =>
          this.onMessageReceived(participant, msg);
        this.adapter.friendsListChangedHandler = (participantsResponse) =>
          this.onFriendsListChanged(participantsResponse);
        this.adapter.windowStatusParticipantChangedHandler = (participant) =>
          this.onWindowStatusParticipantChanged(participant);
        this.adapter.pesquisaClientePorInscricaoReceivedHandler = (
          cliente,
          participantId,
        ) => this.onPesquisaClientePorInscricaoReceived(cliente, participantId);
        this.adapter.clienteAssociadoReceivedHandler = (participantId) =>
          this.onClienteAssociadoReceived(participantId);
        this.adapter.clienteDesassociadoReceivedHandler = (participantId) =>
          this.onClienteDesassociadoReceived(participantId);

        this.activateFriendListFetch();

        this.bufferAudioFile();

        this.hasPagedHistory = this.adapter instanceof PagedHistoryChatAdapter;

        if (this.fileUploadUrl && this.fileUploadUrl !== '') {
          this.fileUploadAdapter = new DefaultFileUploadAdapter(
            this.fileUploadUrl,
            this._httpClient,
          );
        }

        this.NormalizeWindows();

        this.isBootstrapped = true;
      } catch (ex) {
        initializationException = ex;
      }
    }

    if (!this.isBootstrapped) {
      console.error('O componente ng-chat não pôde ser inicializado.');

      if (this.userId == null) {
        console.error(
          'ng-chat não pode ser inicializado sem uma identificação de usuário. Verifique se você forneceu um ID do usuário como parâmetro do componente ng-chat.',
        );
      }
      if (this.adapter == null) {
        console.error(
          'Não é possível iniciar o ng-chat sem um ChatAdapter. Verifique se você forneceu uma implementação do ChatAdapter como parâmetro do componente ng-chat.',
        );
      }
      if (initializationException) {
        console.error(
          `Ocorreu uma exceção ao inicializar o ng-chat. Detalhes: ${initializationException.message}`,
        );
        console.error(initializationException);
      }
    }
  }

  private activateFriendListFetch(): void {
    if (this.adapter) {
      if (this.pollFriendsList) {
        this.fetchFriendsList(true);
        this.pollingIntervalWindowInstance = window.setInterval(
          () => this.fetchFriendsList(false),
          this.pollingInterval,
        );
      } else {
        this.fetchFriendsList(true);
      }
    }
  }

  private async initializeBrowserNotifications() {
    if (this.browserNotificationsEnabled && 'Notification' in window) {
      if (await Notification.requestPermission()) {
        this.browserNotificationsBootstrapped = true;
      }
    }
  }

  private initializeDefaultText(): void {
    if (!this.localization) {
      this.localization = {
        messagePlaceholder: this.messagePlaceholder,
        searchPlaceholder: this.searchPlaceholder,
        title: this.title,
        statusDescription: this.statusDescription,
        browserNotificationTitle: this.browserNotificationTitle,
        loadMessageHistoryPlaceholder: 'Load older messages',
      };
    }
  }

  private initializeTheme(): void {
    if (this.customTheme) {
      this.theme = Theme.Custom;
    } else if (this.theme != Theme.Light && this.theme != Theme.Dark) {
      throw new Error(
        `Configuração de tema inválida para ng-chat. "${this.theme}" não é um valor válido do tema.`,
      );
    }
  }

  private fetchFriendsList(isBootstrapping: boolean): void {
    this.adapter?.listFriends()
      .pipe(
        map((participantsResponse: ParticipantResponse[]) => {
          this.participantsResponse = participantsResponse;

          this.participants = participantsResponse.map(
            (response: ParticipantResponse) => {
              return response.participant;
            },
          );

          this.participantsInteractedWith = [];
        }),
      )
      .subscribe(() => {
        if (isBootstrapping) {
          this.restoreWindowsState();
        }
      });
  }

  fetchMessageHistory(window: Window) {
    if (this.adapter instanceof PagedHistoryChatAdapter) {
      window.isLoadingHistory = true;

      this.adapter
        .getMessageHistoryByPage(
          window.participant.id,
          this.historyPageSize,
          ++window.historyPage,
        )
        .pipe(
          map((result: Message[]) => {
            result.forEach((message) => this.assertMessageType(message));

            window.messages = result.concat(window.messages);
            window.isLoadingHistory = false;

            if (window.messages.length == 0)
              this.adapter?.enviarMensagemBoasVindas(window.participant.id);

            const direction: ScrollDirection =
              window.historyPage == 1
                ? ScrollDirection.Bottom
                : ScrollDirection.Top;
            window.hasMoreMessages = result.length == this.historyPageSize;

            setTimeout(() =>
              this.onFetchMessageHistoryLoaded(result, window, direction, true),
            );
          }),
        )
        .subscribe();
    } else {
      this.adapter?.getMessageHistory(window.participant.id)
        .pipe(
          map((result: Message[]) => {
            result.forEach((message) => this.assertMessageType(message));

            window.messages = result.concat(window.messages);
            window.isLoadingHistory = false;

            if (window.messages.length == 0)
              this.adapter?.enviarMensagemBoasVindas(window.participant.id);

            setTimeout(() =>
              this.onFetchMessageHistoryLoaded(
                result,
                window,
                ScrollDirection.Bottom,
              ),
            );
          }),
        )
        .subscribe();
    }
  }

  private onFetchMessageHistoryLoaded(
    messages: Message[],
    window: Window,
    direction: ScrollDirection,
    forceMarkMessagesAsSeen: boolean = false,
  ): void {
    this.scrollChatWindow(window, direction);

    if (window.hasFocus || forceMarkMessagesAsSeen) {
      const unseenMessages = messages.filter((m) => !m.dateSeen);

      this.markMessagesAsRead(unseenMessages);
      this.onMessagesSeen.emit(unseenMessages);
    }
  }

  private onFriendsListChanged(
    participantsResponse: ParticipantResponse[],
  ): void {
    if (participantsResponse) {
      this.participantsResponse = participantsResponse;

      this.participants = participantsResponse.map(
        (response: ParticipantResponse) => {
          return response.participant;
        },
      );

      this.participantsInteractedWith = [];
    }
  }

  private onMessageReceived(participant: IChatParticipant, message: Message) {
    if (participant && message) {
      let chatWindow = this.openChatWindow(participant);

      this.assertMessageType(message);

      if (!chatWindow[1] || !this.historyEnabled) {
        chatWindow[0].messages.push(message);

        this.scrollChatWindow(chatWindow[0], ScrollDirection.Bottom);

        if (chatWindow[0].hasFocus) {
          this.markMessagesAsRead([message]);
          this.onMessagesSeen.emit([message]);
        }
      }

      this.emitMessageSound(chatWindow[0]);

      if (
        this.maximizeWindowOnNewMessage ||
        (!chatWindow[1] && !chatWindow[0].isCollapsed)
      ) {
        this.emitBrowserNotification(chatWindow[0], message);
      }
    }
  }

  public openChatWindow(
    participant: IChatParticipant,
    focusOnNewWindow: boolean = false,
    invokedByUserClick: boolean = false,
  ): [Window, boolean] {
    let openedWindow = this.windows.find(
      (x) => x.participant.id == participant.id,
    );

    if (!openedWindow) {
      if (invokedByUserClick) {
        this.onParticipantClicked.emit(participant);
      }

      let collapseWindow = invokedByUserClick
        ? false
        : !this.maximizeWindowOnNewMessage;

      let newChatWindow: Window = new Window(
        participant,
        this.historyEnabled,
        collapseWindow,
      );

      if (this.historyEnabled) {
        this.fetchMessageHistory(newChatWindow);
      } else this.adapter?.enviarMensagemBoasVindas(participant.id);

      this.windows.unshift(newChatWindow);

      if (!this.isViewportOnMobileEnabled) {
        if (
          this.windows.length * this.windowSizeFactor >=
          this.viewPortTotalArea -
            (!this.hideFriendsList ? this.friendsListWidth : 0)
        ) {
          this.windows.pop();
        }
      }

      this.updateWindowsState(this.windows);

      if (focusOnNewWindow && !collapseWindow) {
        this.focusOnWindow(newChatWindow);
      }

      this.participantsInteractedWith.push(participant);
      this.onParticipantChatOpened.emit(participant);

      return [newChatWindow, true];
    } else {
      return [openedWindow, false];
    }
  }

  private focusOnWindow(window: Window, callback: Function = () => {}): void {
    let windowIndex = this.windows.indexOf(window);
    if (windowIndex >= 0) {
      setTimeout(() => {
        if (this.chatWindowInputs) {
          let messageInputToFocus =
            this.chatWindowInputs.toArray()[windowIndex];

          messageInputToFocus.nativeElement.focus();
        }

        callback();
      });
    }
  }

  private scrollChatWindow(window: Window, direction: ScrollDirection): void {
    if (!window.isCollapsed) {
      let windowIndex = this.windows.indexOf(window);
      setTimeout(() => {
        if (this.chatMessageClusters) {
          let targetWindow = this.chatMessageClusters.toArray()[windowIndex];

          if (targetWindow) {
            let element =
              this.chatMessageClusters.toArray()[windowIndex].nativeElement;
            let position =
              direction === ScrollDirection.Top ? 0 : element.scrollHeight;
            element.scrollTop = position;
          }
        }
      });
    }
  }

  public markMessagesAsRead(messages: Message[]): void {
    let currentDate = new Date();

    messages.forEach((msg) => {
      msg.dateSeen = currentDate;
    });
  }

  private bufferAudioFile(): void {
    if (this.audioSource && this.audioSource.length > 0) {
      this.audioFile = new Audio();
      this.audioFile.src = this.audioSource;
      this.audioFile.load();
    }
  }

  private emitMessageSound(window: Window): void {
    if (this.audioEnabled && !window.hasFocus && this.audioFile) {
      this.audioFile.play();
    }
  }

  private emitBrowserNotification(window: Window, message: Message): void {
    if (this.browserNotificationsBootstrapped && !window.hasFocus && message) {
      let notification = new Notification(
        `${this.localization?.browserNotificationTitle} ${window.participant.displayName}`,
        {
          body: message.message,
          icon: this.browserNotificationIconSource,
        },
      );

      setTimeout(
        () => {
          notification.close();
        },
        message.message.length <= 50 ? 5000 : 7000,
      );
    }
  }

  private updateWindowsState(windows: Window[]): void {
    if (this.persistWindowsState) {
      let participantIds = windows.map((w) => {
        return w.participant.id;
      });

      localStorage.setItem(
        this.localStorageKey,
        JSON.stringify(participantIds),
      );
    }
  }

  private restoreWindowsState(): void {
    try {
      if (this.persistWindowsState) {
        let stringfiedParticipantIds = localStorage.getItem(
          this.localStorageKey,
        );

        if (stringfiedParticipantIds && stringfiedParticipantIds.length > 0) {
          let participantIds = <number[]>JSON.parse(stringfiedParticipantIds);

          let participantsToRestore = this.participants.filter(
            (u) => participantIds.indexOf(u.id) >= 0,
          );

          participantsToRestore.forEach((participant) => {
            this.openChatWindow(participant);
          });
        }
      }
    } catch (ex) {
      console.error(
        `Ocorreu um erro ao restaurar o estado das janelas de ng-chat. Detalhes: ${ex}`,
      );
    }
  }

  private getClosestWindow(window: Window): Window | undefined {
    let index = this.windows.indexOf(window);

    if (index > 0) {
      return this.windows[index - 1];
    } else if (index == 0 && this.windows.length > 1) {
      return this.windows[index + 1];
    }

    return;
  }

  private assertMessageType(message: Message): void {
    if (!message.type) {
      message.type = MessageType.Text;
    }
  }

  private formatUnreadMessagesTotal(totalUnreadMessages: number): string {
    if (totalUnreadMessages > 0) {
      if (totalUnreadMessages > 99) return '99+';
      else return String(totalUnreadMessages);
    }

    return '';
  }

  unreadMessagesTotal(window: Window): string {
    let totalUnreadMessages = 0;

    if (window) {
      totalUnreadMessages = window.messages.filter(
        (x) => x.fromId != this.userId && !x.dateSeen,
      ).length;
    }

    return this.formatUnreadMessagesTotal(totalUnreadMessages);
  }

  unreadMessagesTotalByParticipant(participant: IChatParticipant): string {
    let openedWindow = this.windows.find(
      (x) => x.participant.id == participant.id,
    );

    if (openedWindow) {
      return this.unreadMessagesTotal(openedWindow);
    } else {
      let totalUnreadMessages = this.participantsResponse
        .filter(
          (x) =>
            x.participant.id == participant.id &&
            !this.participantsInteractedWith.find(
              (u) => u.id == participant.id,
            ) &&
            x.metadata &&
            x.metadata.totalUnreadMessages > 0,
        )
        .map((participantResponse) => {
          return participantResponse.metadata.totalUnreadMessages;
        })[0];

      return this.formatUnreadMessagesTotal(totalUnreadMessages);
    }
  }

  onChatInputTyped(event: any, window: Window): void {
    switch (event.keyCode) {
      case 13:
        if (window.newMessage && window.newMessage.trim() != '') {
          let message = new Message();

          message.fromId = this.userId;
          message.toId = window.participant.id;
          message.message = window.newMessage;
          message.dateSent = new Date();

          window.messages.push(message);

          this.adapter?.sendMessage(message);

          window.newMessage = '';

          this.scrollChatWindow(window, ScrollDirection.Bottom);
        }
        break;
      case 9:
        event.preventDefault();

        let currentWindowIndex = this.windows.indexOf(window);
        let messageInputToFocus =
          this.chatWindowInputs.toArray()[
            currentWindowIndex + (event.shiftKey ? 1 : -1)
          ]; // Goes back on shift + tab

        if (!messageInputToFocus) {
          messageInputToFocus =
            this.chatWindowInputs.toArray()[
              currentWindowIndex > 0 ? 0 : this.chatWindowInputs.length - 1
            ];
        }

        messageInputToFocus.nativeElement.focus();

        break;
      case 27:
        let closestWindow = this.getClosestWindow(window);

        if (closestWindow) {
          this.focusOnWindow(closestWindow, () => {
            this.onCloseChatWindow(window);
          });
        } else {
          this.onCloseChatWindow(window);
        }
    }
  }

  onCloseChatWindow(window: Window): void {
    let index = this.windows.indexOf(window);

    this.windows.splice(index, 1);

    this.updateWindowsState(this.windows);

    this.onParticipantChatClosed.emit(window.participant);
  }

  onChatTitleClicked(event: any): void {
    this.isCollapsed = !this.isCollapsed;
  }

  onChatWindowClicked(window: Window): void {
    window.isCollapsed = !window.isCollapsed;
    this.scrollChatWindow(window, ScrollDirection.Bottom);
  }

  isAvatarVisible(window: Window, message: Message, index: number): boolean {
    if (message.fromId != this.userId) {
      if (index == 0) {
        return true;
      } else {
        if (window.messages[index - 1].fromId != message.fromId) {
          return true;
        }
      }
    }

    return false;
  }

  getChatWindowAvatar(
    participant: IChatParticipant,
    message: Message,
  ): string | null {
    if (participant.participantType == ChatParticipantType.User) {
      return participant.avatar;
    } else if (participant.participantType == ChatParticipantType.Group) {
      let group = participant as Group;
      let userIndex = group.chattingTo.findIndex((x) => x.id == message.fromId);

      return group.chattingTo[userIndex >= 0 ? userIndex : 0].avatar;
    }

    return null;
  }

  toggleWindowFocus(window: Window): void {
    window.hasFocus = !window.hasFocus;
    if (window.hasFocus) {
      const unreadMessages = window.messages.filter(
        (message) =>
          message.dateSeen == null &&
          (message.toId == this.userId ||
            window.participant.participantType === ChatParticipantType.Group),
      );

      if (unreadMessages && unreadMessages.length > 0) {
        this.markMessagesAsRead(unreadMessages);
        this.onMessagesSeen.emit(unreadMessages);
      }
    }
  }

  getStatusTitle(status: ChatParticipantStatus): any {
    let currentStatus = status.toString().toLowerCase();

    return this.localization?.statusDescription[currentStatus];
  }

  triggerOpenChatWindow(user: User): void {
    if (user) {
      this.openChatWindow(user);
    }
  }

  triggerCloseChatWindow(userId: any): void {
    let openedWindow = this.windows.find((x) => x.participant.id == userId);

    if (openedWindow) {
      this.onCloseChatWindow(openedWindow);
    }
  }

  triggerToggleChatWindowVisibility(userId: any): void {
    let openedWindow = this.windows.find((x) => x.participant.id == userId);

    if (openedWindow) {
      this.onChatWindowClicked(openedWindow);
    }
  }

  getUniqueFooterInstanceId(window: Window): string {
    if (window && window.participant) {
      return `ng-chat-footer-status-${window.participant.id}`;
    }

    return 'ng-chat-footer-status';
  }

  getUniqueFileUploadInstanceId(window: Window): string {
    if (window && window.participant) {
      return `ng-chat-file-upload-${window.participant.id}`;
    }

    return 'ng-chat-file-upload';
  }

  triggerNativeFileUpload(window: Window): void {
    if (window) {
      const fileUploadInstanceId = this.getUniqueFileUploadInstanceId(window);
      const uploadElementRef = this.nativeFileInputs?.filter(
        (x) => x.nativeElement.id === fileUploadInstanceId,
      )[0];

      if (uploadElementRef) uploadElementRef.nativeElement.click();
    }
  }

  private clearInUseFileUploader(fileUploadInstanceId: string): void {
    const uploaderInstanceIdIndex =
      this.fileUploadersInUse.indexOf(fileUploadInstanceId);

    if (uploaderInstanceIdIndex > -1) {
      this.fileUploadersInUse.splice(uploaderInstanceIdIndex, 1);
    }
  }

  isUploadingFile(window: Window): boolean {
    const fileUploadInstanceId = this.getUniqueFileUploadInstanceId(window);

    return this.fileUploadersInUse.indexOf(fileUploadInstanceId) > -1;
  }

  onFileChosen(window: Window): void {
    const fileUploadInstanceId = this.getUniqueFileUploadInstanceId(window);
    const uploadElementRef = this.nativeFileInputs?.filter(
      (x) => x.nativeElement.id === fileUploadInstanceId,
    )[0];

    if (uploadElementRef) {
      const file: File = uploadElementRef.nativeElement.files[0];

      this.fileUploadersInUse.push(fileUploadInstanceId);

      this.fileUploadAdapter?.uploadFile(file, window.participant.id).subscribe(
        {
          next: (fileMessage) => {
            this.clearInUseFileUploader(fileUploadInstanceId);
            fileMessage.fromId = this.userId;
            window.messages.push(fileMessage);
            this.adapter?.sendMessage(fileMessage);
            this.scrollChatWindow(window, ScrollDirection.Bottom);
            uploadElementRef.nativeElement.value = '';
          },
          error: () => {
            this.clearInUseFileUploader(fileUploadInstanceId);
            uploadElementRef.nativeElement.value = '';
          }
        }
      );
    }
  }

  onFriendsListCheckboxChange(selectedUser: User, event: Event): void {
    const ischecked = (<HTMLInputElement>event.target).checked
    if (ischecked) {
      this.selectedUsersFromFriendsList.push(selectedUser);
    } else {
      this.selectedUsersFromFriendsList.splice(
        this.selectedUsersFromFriendsList.indexOf(selectedUser),
        1,
      );
    }
  }

  onFriendsListActionCancelClicked(): void {
    if (this.currentActiveOption) {
      this.currentActiveOption.isActive = false;
      this.currentActiveOption = undefined;
      this.selectedUsersFromFriendsList = [];
    }
  }

  onFriendsListActionConfirmClicked(): void {
    if (this.selectedUsersFromFriendsList.length > 0) {
      if (
        this.selectedUsersFromFriendsList[0].participantType ==
        ChatParticipantType.User
      ) {
        let newGroup = new Group(this.selectedUsersFromFriendsList);

        this.openChatWindow(newGroup);

        if (this.groupAdapter) {
          this.groupAdapter.groupCreated(newGroup);
        }
      }
    }

    this.onFriendsListActionCancelClicked();
  }

  isUserSelectedFromFriendsList(user: User): boolean {
    return (
      this.selectedUsersFromFriendsList.filter((item) => item.id == user.id)
        .length > 0
    );
  }

  onWindowStatusParticipantChanged(participant: IChatParticipant): void {
    if (this.windows) {
      var indexWindow = this.windows.findIndex(
        (x) => x.participant.id == participant.id,
      );
      if (indexWindow >= 0)
        this.windows[indexWindow].participant.status = participant.status;
    }
  }

  getUniqueInscricaoCliente(window: Window): string {
    if (window && window.participant) {
      return `ng-chat-inscricao-cliente-${window.participant.id}`;
    }

    return 'ng-chat-inscricao-cliente';
  }

  finalizarAtendimento(window: Window): void {
    if (window) {
      window.mostrarFinalizarAtendimento = false;
      this.adapter?.finalizarAtendimento(window.participant.id);
      this.onCloseChatWindow(window);
    }
  }

  fecharFinalizarAtendimento(window: Window) {
    window.mostrarFinalizarAtendimento = false;
  }

  pesquisarClientePorInscricao(window: Window) {
    if (window && window.inscricao && window.inscricao.trim() != '') {
      window.erroPesquisa = '';
      if (window.inscricao.length == 11 || window.inscricao.length == 14) {
        window.loadingPesquisa = true;
        this.adapter?.pesquisarClientePorInscricao(
          window.inscricao,
          window.participant.id,
        );
      } else window.erroPesquisa = 'CPF/CNPJ deve ter 11 ou 14 números';
    }
  }

  private onPesquisaClientePorInscricaoReceived(
    cliente: any,
    participantId: string,
  ) {
    var window = this.windows.find((x) => x.participant.id == participantId);

    if (window) {
      window.loadingPesquisa = false;

      if (cliente && cliente.devedorId) {
        window.clienteNome = cliente.nome;
        window.devedorId = cliente.devedorId;
        window.mostrarPesquisaCliente = false;
        window.mostrarAssociarCliente = true;
      } else {
        window.erroPesquisa = 'Cliente não encontrado!';
      }
    }
  }

  fecharPesquisarClientePorInscricao(window: Window) {
    window.inscricao = '';
    window.erroPesquisa = '';
    window.mostrarPesquisaCliente = false;
    window.loadingPesquisa = false;
  }

  associarCliente(window: Window): void {
    if (window) {
      if (
        window.devedorId &&
        window.devedorId.trim() != '' &&
        window.participant.id &&
        window.participant.id.trim() != ''
      ) {
        window.loadingAssociar = true;
        this.adapter?.associarCliente(window.devedorId, window.participant.id);
      }
    }
  }

  private onClienteAssociadoReceived(participantId: string) {
    var window = this.windows.find((x) => x.participant.id == participantId);

    if (window) {
      window.associado = true;
      this.fecharAssociarCliente(window);
      window.mostrarDesassociarCliente = true;
    }
  }

  fecharAssociarCliente(window: Window) {
    window.mostrarAssociarCliente = false;
    window.loadingAssociar = false;
  }

  desassociarCliente(window: Window): void {
    if (window) {
      if (
        window.devedorId &&
        window.devedorId.trim() != '' &&
        window.participant.id &&
        window.participant.id.trim() != ''
      ) {
        window.loadingAssociar = true;
        this.adapter?.desassociarCliente(window.participant.id);
      }
    }
  }

  private onClienteDesassociadoReceived(participantId: string) {
    var window = this.windows.find((x) => x.participant.id == participantId);

    if (window) {
      window.inscricao = '';
      window.clienteNome = '';
      window.devedorId = undefined;
      window.associado = false;
      this.fecharDesassociarCliente(window);
      window.mostrarPesquisaCliente = true;
    }
  }

  fecharDesassociarCliente(window: Window) {
    window.loadingDesassociar = false;
    window.mostrarDesassociarCliente = false;
  }
}
