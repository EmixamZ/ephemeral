import { JsonPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedEditor } from '../../components/shared-editor/shared-editor';
import { Chatservice } from '../../services/chatservice';

@Component({
  selector: 'app-join',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    JsonPipe,
    SharedEditor
  ],
  templateUrl: './join.html',
  styleUrl: './join.css',
})
export class Join {

  chatService = inject(Chatservice);
  connectionState = this.chatService.connectionState;

  offerString = '';
  answer = signal<RTCSessionDescriptionInit | null>(null);
  
  answerInBase64 = computed(() => {
    const ans = this.answer();
    if (!ans) {
      return '';
    }
    return btoa(JSON.stringify(ans));
  });

  public async joinSession() {
    if (!this.offerString) {
      console.error('No offer provided');
      return;
    }

    try {
      const offerJson = atob(this.offerString);
      const offer: RTCSessionDescriptionInit = JSON.parse(offerJson);
      const answer = await this.chatService.answerOffer(offer);
      this.answer.set(answer);
      console.log('Answer created successfully');
    } catch (error) {
      console.error('Error joining session:', error);
    }
  }

  public sendTestMessage() {
    this.chatService.sendMessage('Hello from joiner!');
  }

  public copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }
}
