import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { NgChat } from './ng-chat.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgChatOptionsComponent } from './components/ng-chat-options/ng-chat-options.component';
import { EmojifyPipe } from './pipes/emojify.pipe';
import { GroupMessageDisplayNamePipe } from './pipes/group-message-display-name.pipe';
import { LinkfyPipe } from './pipes/linkfy.pipe';
import { SanitizePipe } from './pipes/sanitize.pipe';

@NgModule({
  declarations: [
    NgChat,
    EmojifyPipe,
    LinkfyPipe,
    SanitizePipe,
    GroupMessageDisplayNamePipe,
    NgChatOptionsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule
  ],
  exports: [NgChat]
})
export class NgChatModule { }
