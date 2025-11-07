import { JsonPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SharedEditor } from '../../components/shared-editor/shared-editor';
import { Chatservice } from '../../services/chatservice';

@Component({
  selector: 'app-create',
  imports: [JsonPipe, FormsModule, SharedEditor],
  templateUrl: './create.html',
  styleUrl: './create.css',
  providers:[

  ]
})
export class Create {

  chatService = inject(Chatservice);
  connectionState = this.chatService.connectionState;
  
  offerInBase64 = computed(() => {
    const offer = this.offer();
    if (!offer) {
      return '';
    }
    return btoa(JSON.stringify(offer));
  });
  
  offer = signal<RTCSessionDescriptionInit | null>(null);
  answerString = '';
  showAnswerInput = signal(false);

  public async createOffer() {
    try {
      const offer = await this.chatService.createOffer();
      this.offer.set(offer);
      this.showAnswerInput.set(true);
      console.log('Offer created successfully');
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }

  public async applyAnswer() {
    if (!this.answerString) {
      console.error('No answer provided');
      return;
    }

    try {
      const answerJson = atob(this.answerString);
      const answer: RTCSessionDescriptionInit = JSON.parse(answerJson);
      await this.chatService.applyAnswer(answer);
      console.log('Answer applied successfully');
    } catch (error) {
      console.error('Error applying answer:', error);
    }
  }

  public sendTestMessage() {
    this.chatService.sendMessage('Hello from creator!');
  }

  public copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }
}
