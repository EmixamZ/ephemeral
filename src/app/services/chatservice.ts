import { Injectable, signal, WritableSignal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Chatservice {
  // Single peer connection - either creates offer or answers one
  public peerConnection: RTCPeerConnection | null = null;
  public dataChannel: RTCDataChannel | null = null;

  public Data: WritableSignal<string | null> = signal(null);
  public connectionState: WritableSignal<RTCPeerConnectionState> = signal('new');

  // Store ICE candidates that arrive before remote description is set
  private pendingIceCandidates: RTCIceCandidate[] = [];

  constructor() {
    console.log('Chatservice initialized');
  }

  private initializePeerConnection() {
    if (this.peerConnection) {
      return;
    }

    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ]
    });

    // Monitor connection state
    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection) {
        console.log('Connection state:', this.peerConnection.connectionState);
        this.connectionState.set(this.peerConnection.connectionState);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      if (this.peerConnection) {
        console.log('ICE connection state:', this.peerConnection.iceConnectionState);
      }
    };

    // ICE candidates need to be exchanged manually in your app
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('New ICE candidate:', event.candidate);
        // In a real app, you would send this to the other peer via signaling server
      } else {
        console.log('All ICE candidates have been sent');
      }
    };
  }

  // Create an offer (initiator side)
  public async createOffer() {
    this.initializePeerConnection();
    
    if (!this.peerConnection) {
      throw new Error('Failed to initialize peer connection');
    }

    // Create data channel on the initiator side
    this.dataChannel = this.peerConnection.createDataChannel('chat');
    this.setupDataChannel(this.dataChannel);

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Wait for ICE gathering to complete for a simpler offer
    await this.waitForIceGathering();

    return this.peerConnection.localDescription;
  }

  // Answer an offer (receiver side)
  public async answerOffer(offer: RTCSessionDescriptionInit) {
    this.initializePeerConnection();
    
    if (!this.peerConnection) {
      throw new Error('Failed to initialize peer connection');
    }

    // Set up data channel listener on the receiver side
    this.peerConnection.ondatachannel = (event) => {
      console.log('Data channel received');
      this.dataChannel = event.channel;
      this.setupDataChannel(this.dataChannel);
    };

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

    // Add any pending ICE candidates
    for (const candidate of this.pendingIceCandidates) {
      await this.peerConnection.addIceCandidate(candidate);
    }
    this.pendingIceCandidates = [];

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    // Wait for ICE gathering to complete
    await this.waitForIceGathering();

    return this.peerConnection.localDescription;
  }

  // Apply answer (on initiator side after receiver sends answer)
  public async applyAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

    // Add any pending ICE candidates
    for (const candidate of this.pendingIceCandidates) {
      await this.peerConnection.addIceCandidate(candidate);
    }
    this.pendingIceCandidates = [];
  }

  // Add ICE candidate from remote peer
  public async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    if (this.peerConnection.remoteDescription) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      // Queue candidates that arrive before remote description
      this.pendingIceCandidates.push(new RTCIceCandidate(candidate));
    }
  }

  private setupDataChannel(channel: RTCDataChannel) {
    channel.onopen = () => {
      console.log('Data channel is open and ready to be used.');
    };

    channel.onclose = () => {
      console.log('Data channel is closed.');
    };

    channel.onmessage = (event) => {
      console.log('Received message:', event.data);
      this.Data.set(event.data);
    };

    channel.onerror = (error) => {
      console.error('Data channel error:', error);
    };
  }

  public sendMessage(message: string) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(message);
      console.log('Message sent:', message);
    } else {
      console.error('Data channel is not open. State:', this.dataChannel?.readyState);
    }
  }

  private waitForIceGathering(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.peerConnection) {
        resolve();
        return;
      }

      if (this.peerConnection.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      const checkState = () => {
        if (this.peerConnection?.iceGatheringState === 'complete') {
          this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };

      this.peerConnection.addEventListener('icegatheringstatechange', checkState);
    });
  }

  public close() {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.connectionState.set('closed');
  }
}
