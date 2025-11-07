import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chatservice } from '../../services/chatservice';

@Component({
  selector: 'app-shared-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './shared-editor.html',
  styleUrl: './shared-editor.css',
})
export class SharedEditor {
  chatService = inject(Chatservice);
  
  text = signal<string>('');
  private isUpdatingFromRemote = false;

  constructor() {
    // Listen for incoming text updates
    effect(() => {
      const data = this.chatService.Data();
      if (data && !this.isUpdatingFromRemote) {
        try {
          const message = JSON.parse(data);
          if (message.type === 'text-update') {
            this.isUpdatingFromRemote = true;
            this.text.set(message.content);
            this.isUpdatingFromRemote = false;
          }
        } catch (error) {
          console.error('Error parsing received data:', error);
        }
      }
    });
  }

  onTextChange(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    const newText = target.value;
    
    if (!this.isUpdatingFromRemote) {
      this.text.set(newText);
      
      // Send the update to the other peer
      const message = JSON.stringify({
        type: 'text-update',
        content: newText
      });
      
      this.chatService.sendMessage(message);
    }
  }
}
