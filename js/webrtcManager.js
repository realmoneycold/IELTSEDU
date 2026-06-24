/**
 * WebRTC Manager for Live Hub
 * Handles voice/video calls, peer connections, and media streaming
 * Discord-like functionality for IELTS Practice rooms
 */

class WebRTCManager {
    constructor() {
        // Prevent petite-vue / @vue/reactivity from wrapping this instance in a
        // reactive Proxy. WebRTCManager holds non-plain objects (Map, MediaStream,
        // RTCPeerConnection, AudioContext) which break Vue's reactive collection
        // handlers and throw "Cannot create proxy with a non-object as target"
        // when methods like leaveRoom() are called through the proxy.
        this.__v_skip = true;
        this.socket = null;
        this.socketConnected = false;
        this.localStream = null;
        this.screenStream = null;
        this.peers = new Map(); // socketId -> RTCPeerConnection
        this.remoteStreams = new Map(); // socketId -> MediaStream
        this.roomId = null;
        this.isMuted = false;
        this.isVideoOn = false;
        this.isDeafened = false;
        this.isScreenSharing = false;
        this.onParticipantJoined = null;
        this.onParticipantLeft = null;
        this.onRemoteStream = null;
        this.onLocalStream = null;
        this.onVoiceActivity = null;
        this.onMessage = null;
        this.onScreenShare = null;
        this.audioAnalyser = null;
        this.voiceActivityInterval = null;
        this.audioContext = null; // Audio context for diagnostics
        this.audioElements = new Map(); // socketId -> audio element
        
        // STUN/TURN servers configuration
        // Note: process.env is NOT available in browser - use client-side config only
        this.iceServers = [
            // Public STUN servers (free, always available)
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            // Additional public STUN servers for better connectivity
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            // Coturn TURN server configuration (for production NAT traversal)
            // Deploy a TURN server and uncomment these lines:
            // {
            //     urls: 'turn:your-server.com:3478',
            //     username: 'ieltspractice',
            //     credential: 'your-secure-password'
            // },
            // For testing with free TURN servers (not recommended for production):
            // {
            //     urls: 'turn:openrelay.metered.ca:80',
            //     username: 'openrelayproject',
            //     credential: 'openrelayproject'
            // }
        ];
    }

    /**
     * Initialize Socket.io connection and set up event handlers
     * Gracefully handles Socket.io connection failures
     */
    async initialize() {
        try {
            // Check if io (Socket.io) is available
            if (typeof io === 'undefined') {
                console.warn('⚠️ Socket.io library not loaded. Voice chat will be limited.');
                this.socketConnected = false;
                return;
            }

            const token = localStorage.getItem('token') || localStorage.getItem('ielts_token');
            const serverUrl = window.location.origin;
            
            try {
                this.socket = io(serverUrl, {
                    auth: { token },
                    transports: ['websocket', 'polling'],
                    reconnection: true,
                    reconnectionAttempts: 5,
                    reconnectionDelay: 1000
                });
            } catch (ioError) {
                console.warn('⚠️ Socket.io initialization error:', ioError.message);
                this.socketConnected = false;
                return;
            }

            this.setupSocketHandlers();
            
            return new Promise((resolve) => {
                const connectionTimeout = setTimeout(() => {
                    console.warn('⚠️ Socket.io connection timeout - proceeding with limited functionality');
                    this.socketConnected = false;
                    resolve(false); // Resolve with false to indicate partial failure
                }, 5000);

                this.socket.on('connect', () => {
                    clearTimeout(connectionTimeout);
                    console.log('✅ Connected to signaling server');
                    this.socketConnected = true;
                    resolve(true);
                });
                
                this.socket.on('connect_error', (err) => {
                    clearTimeout(connectionTimeout);
                    console.warn('⚠️ Socket.io connection error:', err.message || err);
                    this.socketConnected = false;
                    resolve(false); // Don't reject - allow app to continue
                });
            });
        } catch (err) {
            console.error('❌ Unexpected error during WebRTC initialization:', err);
            this.socketConnected = false;
            // Don't throw - allow app to continue with degraded functionality
        }
    }

    /**
     * Set up all Socket.io event handlers
     * Safely handles missing socket
     */
    setupSocketHandlers() {
        if (!this.socket) {
            console.warn('⚠️ Socket not available - skipping socket handler setup');
            return;
        }

        // Room events
        this.socket.on('user-joined', (participant) => this.handleUserJoined(participant));
        this.socket.on('user-left', ({ socketId }) => this.handleUserLeft(socketId));
        this.socket.on('existing-participants', (participants) => this.handleExistingParticipants(participants));
        
        // WebRTC signaling
        this.socket.on('offer', ({ senderId, offer }) => this.handleOffer(senderId, offer));
        this.socket.on('answer', ({ senderId, answer }) => this.handleAnswer(senderId, answer));
        this.socket.on('ice-candidate', ({ senderId, candidate }) => this.handleIceCandidate(senderId, candidate));
        
        // Media state
        this.socket.on('media-state-change', (data) => this.handleRemoteMediaStateChange(data));
        this.socket.on('voice-activity', (data) => this.handleRemoteVoiceActivity(data));
        
        // Chat
        this.socket.on('new-message', (message) => {
            if (this.onMessage) this.onMessage(message);
        });
        this.socket.on('message-history', (messages) => {
            messages.forEach(msg => {
                if (this.onMessage) this.onMessage(msg);
            });
        });
        this.socket.on('user-typing', (data) => {
            // Handle typing indicator
        });
        
        // Screen sharing
        this.socket.on('screen-share-started', (data) => {
            if (this.onScreenShare) this.onScreenShare('started', data);
        });
        this.socket.on('screen-share-stopped', (data) => {
            if (this.onScreenShare) this.onScreenShare('stopped', data);
        });
        this.socket.on('screen-share-active', ({ userId }) => {
            console.log('Screen share active by:', userId);
        });
        
        // Errors
        this.socket.on('room-error', ({ message }) => {
            console.error('Room error:', message);
            alert(message);
        });
        
        this.socket.on('screen-share-error', ({ message }) => {
            console.error('Screen share error:', message);
            alert(message);
        });
    }

    /**
     * Join a voice/video room with enhanced permission handling
     * Safely handles missing socket connection
     */
    async joinRoom(roomId, roomType, userName, avatar, isHost = false, onPermissionError = null, maxUsers = null) {
        this.roomId = roomId;

        // Get user media before joining. If the caller already acquired a stream
        // (typical when invoked from initializeVoiceChat), reuse it to avoid
        // re-prompting the browser and re-firing onLocalStream.
        let mediaError = null;
        const hasUsableStream = this.localStream && this.localStream.active &&
            (this.localStream.getAudioTracks().length > 0 || this.localStream.getVideoTracks().length > 0);

        if (hasUsableStream) {
            console.log('✅ Reusing existing local stream for joinRoom');
        } else {
            try {
                // Try audio + video first
                await this.getLocalStream(true, true, (error) => {
                    mediaError = error;
                    if (onPermissionError) onPermissionError(error);
                });
                console.log('✅ Got camera and microphone access');
            } catch (err) {
                console.warn('⚠️ Could not get camera/mic:', err.name, err.message);

                if (!mediaError) {
                    mediaError = err;
                    if (onPermissionError) onPermissionError(err);
                }

                // Try audio only as fallback
                try {
                    await this.getLocalStream(true, false, (error) => {
                        if (!mediaError) {
                            mediaError = error;
                            if (onPermissionError) onPermissionError(error);
                        }
                    });
                    console.log('✅ Got microphone access (audio only)');
                } catch (err2) {
                    console.error('❌ Could not get any media:', err2);

                    // Still join the room but notify about media issue
                    if (this.onMessage) {
                        this.onMessage({
                            id: Date.now(),
                            userName: 'System',
                            avatar: null,
                            text: '⚠️ Unable to access camera or microphone. You can still participate via chat.',
                            type: 'system',
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            }
        }

        // Only emit if socket is connected
        if (this.socket && this.socket.connected) {
            this.socket.emit('join-room', {
                roomId,
                roomType,
                userName,
                avatar,
                isHost,
                maxUsers
            });
        } else {
            console.warn('⚠️ Socket not available - cannot emit join-room. Room will be local only.');
            // Still trigger local stream callback
            if (this.onLocalStream && this.localStream) {
                this.onLocalStream(this.localStream);
            }
        }

        // Start voice activity detection if we have audio
        if (this.localStream && this.localStream.getAudioTracks().length > 0) {
            this.startVoiceActivityDetection();
        }
    }

    /**
     * Leave the current room
     */
    leaveRoom() {
        this.stopVoiceActivityDetection();
        
        // Close all peer connections
        this.peers.forEach((peer, socketId) => {
            peer.close();
        });
        this.peers.clear();
        this.remoteStreams.clear();
        
        // Clean up all audio elements
        this.audioElements.forEach((audioElement, socketId) => {
            this.removeAudioElement(socketId);
        });
        this.audioElements.clear();
        
        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }
        
        // Stop screen share if active
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }
        
        if (this.roomId && this.socket && this.socket.connected) {
            this.socket.emit('leave-room', { roomId: this.roomId });
            this.roomId = null;
        }
    }

    /**
     * Diagnose audio system and return detailed diagnostic info
     * @returns {Promise<Object>} Audio diagnostics report
     */
    async diagnosAudio() {
        const report = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            mediaDevices: !!navigator.mediaDevices,
            audioContext: this.audioContext ? this.audioContext.state : 'not-initialized',
            localStream: {
                exists: !!this.localStream,
                audioTracks: this.localStream ? this.localStream.getAudioTracks().length : 0,
                videoTracks: this.localStream ? this.localStream.getVideoTracks().length : 0,
                audioEnabled: this.localStream ? this.localStream.getAudioTracks().some(t => t.enabled) : false
            },
            remoteStreams: this.remoteStreams.size,
            peers: this.peers.size,
            issues: []
        };

        // Check for browser support
        if (!navigator.mediaDevices) {
            report.issues.push('Browser does not support MediaDevices API');
        }

        // Check local audio
        if (this.localStream) {
            const audioTracks = this.localStream.getAudioTracks();
            if (audioTracks.length === 0) {
                report.issues.push('No audio tracks in local stream');
            } else {
                audioTracks.forEach((track, idx) => {
                    if (!track.enabled) {
                        report.issues.push(`Audio track ${idx} is disabled`);
                    }
                    if (track.readyState !== 'live') {
                        report.issues.push(`Audio track ${idx} is not live: ${track.readyState}`);
                    }
                });
            }
        } else {
            report.issues.push('No local stream available');
        }

        // Check remote audio
        if (this.remoteStreams.size === 0) {
            report.issues.push('No remote streams received yet');
        } else {
            this.remoteStreams.forEach((stream, socketId) => {
                const audioTracks = stream.getAudioTracks();
                if (audioTracks.length === 0) {
                    report.issues.push(`Remote peer ${socketId} has no audio tracks`);
                }
            });
        }

        // Log report
        console.log('🔊 Audio Diagnostics:', report);
        return report;
    }

    /**
     * Enable all audio tracks in a stream
     * @param {MediaStream} stream - The stream to enable audio for
     */
    enableAudioTracks(stream) {
        if (!stream) return;
        stream.getAudioTracks().forEach(track => {
            track.enabled = true;
            console.log('🔊 Audio track enabled:', track.label);
        });
    }

    /**
     * Initialize AudioContext for better audio handling
     */
    initAudioContext() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!this.audioContext) {
                this.audioContext = new AudioContext();
                console.log('🔊 AudioContext initialized:', this.audioContext.state);
            }
            return this.audioContext;
        } catch (err) {
            console.error('Failed to initialize AudioContext:', err);
            return null;
        }
    }

    /**
     * Resume audio context (must be called on user interaction)
     * Browsers block audio autoplay until user interaction
     */
    async resumeAudioContext() {
        if (!this.audioContext) {
            this.initAudioContext();
        }
        
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('🔊 AudioContext resumed successfully');
                return true;
            } catch (err) {
                console.error('❌ Failed to resume AudioContext:', err);
                return false;
            }
        }
        
        console.log('🔊 AudioContext already running or not available');
        return true;
    }

    /**
     * Get local media stream (camera/mic) with comprehensive permission handling
     * @param {boolean} audio - Request microphone access
     * @param {boolean} video - Request camera access
     * @param {Function} onPermissionError - Callback for permission errors with user-friendly message
     * @returns {Promise<MediaStream>} Local media stream
     */
    async getLocalStream(audio = true, video = true, onPermissionError = null) {
        // Check if mediaDevices API is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            const error = new Error('Your browser does not support video calling. Please use Chrome, Firefox, or Safari.');
            error.name = 'NotSupportedError';
            if (onPermissionError) onPermissionError(error);
            throw error;
        }

        try {
            const constraints = {
                audio: audio ? {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000
                } : false,
                video: video ? {
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 },
                    facingMode: 'user',
                    frameRate: { ideal: 30, min: 15 }
                } : false
            };

            // Request permissions with timeout
            const permissionPromise = navigator.mediaDevices.getUserMedia(constraints);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Permission request timed out')), 15000);
            });

            this.localStream = await Promise.race([permissionPromise, timeoutPromise]);

            // Verify we got the requested tracks
            const audioTracks = this.localStream.getAudioTracks();
            const videoTracks = this.localStream.getVideoTracks();

            if (audio && audioTracks.length === 0) {
                console.warn('⚠️ No audio tracks received despite requesting audio');
            }
            if (video && videoTracks.length === 0) {
                console.warn('⚠️ No video tracks received despite requesting video');
            }

            // Set up track ended handlers (e.g., user disables camera in OS)
            audioTracks.forEach(track => {
                track.enabled = true; // Explicitly enable audio tracks
                track.onended = () => {
                    console.log('🎤 Audio track ended (user may have disabled mic)');
                    this.isMuted = true;
                };
            });

            videoTracks.forEach(track => {
                track.onended = () => {
                    console.log('📹 Video track ended (user may have disabled camera)');
                    this.isVideoOn = false;
                };
            });

            // Initialize AudioContext for better audio playback handling
            if (audio && audioTracks.length > 0) {
                this.initAudioContext();
                console.log('🔊 Audio stream ready with', audioTracks.length, 'track(s)');
            }

            if (this.onLocalStream) {
                this.onLocalStream(this.localStream);
            }

            this.isMuted = !audio || audioTracks.length === 0;
            this.isVideoOn = video && videoTracks.length > 0;

            console.log('✅ Local stream acquired:', {
                audio: audioTracks.length,
                video: videoTracks.length,
                audioEnabled: this.isMuted ? false : true,
                videoEnabled: this.isVideoOn
            });

            return this.localStream;

        } catch (err) {
            console.error('❌ getUserMedia error:', err.name, err.message);

            // Provide user-friendly error messages
            const enhancedError = this.enhancePermissionError(err);

            if (onPermissionError) {
                onPermissionError(enhancedError);
            }

            throw enhancedError;
        }
    }

    /**
     * Enhance permission errors with user-friendly messages and recovery suggestions
     */
    enhancePermissionError(err) {
        const enhanced = new Error(err.message);
        enhanced.name = err.name;
        enhanced.originalError = err;

        switch (err.name) {
            case 'NotAllowedError':
            case 'PermissionDeniedError':
                enhanced.userMessage = '🚫 Camera/Microphone Access Denied';
                enhanced.description = 'Please allow camera and microphone access in your browser settings to join the video call.';
                enhanced.recoverySteps = [
                    'Click the lock/site info icon in your browser address bar',
                    'Find "Camera" and "Microphone" permissions',
                    'Change from "Block" to "Allow"',
                    'Refresh the page and try again'
                ];
                enhanced.isRecoverable = true;
                break;

            case 'NotFoundError':
            case 'DevicesNotFoundError':
                enhanced.userMessage = '📷 No Camera or Microphone Found';
                enhanced.description = 'We could not detect a camera or microphone on your device.';
                enhanced.recoverySteps = [
                    'Connect a webcam or headset with microphone',
                    'Ensure your devices are not being used by another application',
                    'Check that your devices are properly connected'
                ];
                enhanced.isRecoverable = true;
                break;

            case 'NotReadableError':
            case 'TrackStartError':
                enhanced.userMessage = '🔌 Device is Busy';
                enhanced.description = 'Your camera or microphone is being used by another application.';
                enhanced.recoverySteps = [
                    'Close other apps using your camera (Zoom, Teams, etc.)',
                    'Refresh the page',
                    'Try disconnecting and reconnecting your devices'
                ];
                enhanced.isRecoverable = true;
                break;

            case 'OverconstrainedError':
                enhanced.userMessage = '⚙️ Camera Resolution Not Supported';
                enhanced.description = 'Your camera does not support the requested resolution.';
                enhanced.recoverySteps = [
                    'Try using a different camera',
                    'Join with audio only (camera disabled)'
                ];
                enhanced.isRecoverable = true;
                break;

            case 'AbortError':
                enhanced.userMessage = '⏹️ Permission Request Cancelled';
                enhanced.description = 'You cancelled the permission request or it timed out.';
                enhanced.recoverySteps = [
                    'Click "Join Room" again',
                    'Allow permissions when prompted'
                ];
                enhanced.isRecoverable = true;
                break;

            case 'NotSupportedError':
                enhanced.userMessage = err.message;
                enhanced.description = 'Your browser does not support WebRTC.';
                enhanced.recoverySteps = [
                    'Please use Chrome, Firefox, Safari, or Edge'
                ];
                enhanced.isRecoverable = false;
                break;

            case 'SecurityError':
                enhanced.userMessage = '🔒 Insecure Connection';
                enhanced.description = 'Camera and microphone require a secure HTTPS connection or localhost.';
                enhanced.recoverySteps = [
                    'Access the site via HTTPS',
                    'If testing locally, use http://localhost instead of http://127.0.0.1'
                ];
                enhanced.isRecoverable = true;
                break;

            default:
                enhanced.userMessage = '❌ Media Access Error';
                enhanced.description = `An unexpected error occurred: ${err.message}`;
                enhanced.recoverySteps = [
                    'Check that your devices are connected',
                    'Refresh the page and try again',
                    'Try using a different browser'
                ];
                enhanced.isRecoverable = true;
        }

        return enhanced;
    }

    /**
     * Try to get audio-only stream as fallback when video fails
     */
    async getAudioOnlyStream(onPermissionError = null) {
        try {
            return await this.getLocalStream(true, false, onPermissionError);
        } catch (err) {
            console.error('❌ Audio-only fallback also failed:', err);
            throw err;
        }
    }

    /**
     * Start screen sharing
     */
    async startScreenShare() {
        try {
            this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' },
                audio: true
            });
            
            // Replace video track in all peer connections
            const screenTrack = this.screenStream.getVideoTracks()[0];
            
            this.peers.forEach((peer) => {
                const sender = peer.getSenders().find(s => 
                    s.track && s.track.kind === 'video'
                );
                if (sender) {
                    sender.replaceTrack(screenTrack);
                }
            });
            
            // Handle screen share stop
            screenTrack.onended = () => {
                this.stopScreenShare();
            };
            
            this.isScreenSharing = true;
            this._safeEmit('screen-share-start', { isScreenSharing: true });
            
            return this.screenStream;
        } catch (err) {
            console.error('Error starting screen share:', err);
            throw err;
        }
    }

    /**
     * Stop screen sharing
     */
    async stopScreenShare() {
        if (!this.screenStream) return;
        
        // Stop screen stream
        this.screenStream.getTracks().forEach(track => track.stop());
        
        // Restore camera video to peer connections
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                this.peers.forEach((peer) => {
                    const sender = peer.getSenders().find(s => 
                        s.track && s.track.kind === 'video'
                    );
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                });
            }
        }
        
        this.screenStream = null;
        this.isScreenSharing = false;
        this._safeEmit('screen-share-stop', {});
    }

    /**
     * Handle new user joining room
     */
    async handleUserJoined(participant) {
        console.log('👤 User joined:', participant.name);
        
        if (participant.socketId === 'ai-coach') {
            if (this.onParticipantJoined) {
                this.onParticipantJoined(participant);
            }
            return;
        }
        
        // Create peer connection for this user
        await this.createPeerConnection(participant.socketId, true);
        
        if (this.onParticipantJoined) {
            this.onParticipantJoined(participant);
        }
    }

    /**
     * Handle user leaving room
     */
    handleUserLeft(socketId) {
        console.log('👋 User left:', socketId);
        
        // Close peer connection
        const peer = this.peers.get(socketId);
        if (peer) {
            peer.close();
            this.peers.delete(socketId);
        }
        
        // Remove remote stream
        this.remoteStreams.delete(socketId);
        
        // Remove audio element for this participant
        this.removeAudioElement(socketId);
        
        if (this.onParticipantLeft) {
            this.onParticipantLeft(socketId);
        }
    }

    /**
     * Handle existing participants when joining
     */
    async handleExistingParticipants(participants) {
        console.log('📋 Existing participants:', participants.length);
        
        for (const participant of participants) {
            // Don't create connection to self
            if (participant.socketId === this.socket.id) continue;
            
            if (participant.socketId === 'ai-coach') {
                if (this.onParticipantJoined) {
                    this.onParticipantJoined(participant);
                }
                continue;
            }
            
            // Create peer connection (they will send offer)
            await this.createPeerConnection(participant.socketId, false);
            
            if (this.onParticipantJoined) {
                this.onParticipantJoined(participant);
            }
        }
    }

    /**
     * Create RTCPeerConnection
     */
    async createPeerConnection(socketId, isInitiator) {
        const peer = new RTCPeerConnection({
            iceServers: this.iceServers
        });
        
        this.peers.set(socketId, peer);
        
        // Add local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peer.addTrack(track, this.localStream);
            });
        }
        
        // Handle ICE candidates
        peer.onicecandidate = (event) => {
            if (event.candidate) {
                this._safeEmit('ice-candidate', {
                    targetId: socketId,
                    candidate: event.candidate
                });
            }
        };
        
        // Handle remote stream
        peer.ontrack = (event) => {
            console.log('📺 Received remote stream from:', socketId);
            const remoteStream = event.streams[0];
            this.remoteStreams.set(socketId, remoteStream);
            
            // Create audio element for remote stream playback
            this.createAudioElement(socketId, remoteStream);
            
            if (this.onRemoteStream) {
                this.onRemoteStream(socketId, remoteStream);
            }
        };
        
        // Handle connection state changes
        peer.onconnectionstatechange = () => {
            const state = peer.connectionState;
            console.log(`🔗 Connection state with ${socketId}:`, state);
            
            // Log detailed connection information
            if (state === 'connected') {
                console.log(`✅ Successfully connected to ${socketId}`);
            } else if (state === 'disconnected') {
                console.log(`❌ Disconnected from ${socketId}`);
            } else if (state === 'failed') {
                console.error(`💥 Connection failed with ${socketId}`);
            } else if (state === 'closed') {
                console.log(`🔒 Connection closed with ${socketId}`);
            }
        };

        // Handle ICE connection state changes
        peer.oniceconnectionstatechange = () => {
            const state = peer.iceConnectionState;
            console.log(`🧊 ICE connection state with ${socketId}:`, state);
            
            if (state === 'connected' || state === 'completed') {
                console.log(`✅ ICE connection established with ${socketId}`);
            } else if (state === 'failed') {
                console.error(`💥 ICE connection failed with ${socketId} - likely NAT traversal issue`);
            } else if (state === 'disconnected') {
                console.warn(`⚠️ ICE connection disconnected from ${socketId}`);
            }
        };
        
        // If initiator, create and send offer
        if (isInitiator) {
            try {
                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);

                this._safeEmit('offer', {
                    targetId: socketId,
                    offer: offer
                });
            } catch (err) {
                console.error('Error creating offer:', err);
            }
        }
        
        return peer;
    }

    /**
     * Handle incoming WebRTC offer
     */
    async handleOffer(senderId, offer) {
        console.log('📨 Received offer from:', senderId);
        
        let peer = this.peers.get(senderId);
        if (!peer) {
            peer = await this.createPeerConnection(senderId, false);
        }
        
        try {
            await peer.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);

            this._safeEmit('answer', {
                targetId: senderId,
                answer: answer
            });
        } catch (err) {
            console.error('Error handling offer:', err);
        }
    }

    /**
     * Handle incoming WebRTC answer
     */
    async handleAnswer(senderId, answer) {
        console.log('📨 Received answer from:', senderId);
        
        const peer = this.peers.get(senderId);
        if (peer) {
            try {
                await peer.setRemoteDescription(new RTCSessionDescription(answer));
            } catch (err) {
                console.error('Error handling answer:', err);
            }
        }
    }

    /**
     * Handle incoming ICE candidate
     */
    async handleIceCandidate(senderId, candidate) {
        const peer = this.peers.get(senderId);
        if (peer) {
            try {
                await peer.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.error('Error adding ICE candidate:', err);
            }
        }
    }

    /**
     * Toggle microphone mute
     */
    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                this.isMuted = !audioTrack.enabled;

                this._safeEmit('media-state-change', {
                    isMuted: this.isMuted
                });

                return this.isMuted;
            }
        }
        return false;
    }

    /**
     * Emit a Socket.io event only when the connection is alive.
     * Prevents "Cannot read properties of null" crashes when signaling drops.
     */
    _safeEmit(event, payload) {
        try {
            if (this.socket && this.socket.connected) {
                this.socket.emit(event, payload);
                return true;
            }
            console.warn(`⚠️ Skipping emit "${event}" — socket not connected`);
            return false;
        } catch (err) {
            console.warn(`⚠️ Failed to emit "${event}":`, err.message);
            return false;
        }
    }

    /**
     * Toggle deafen (mute incoming audio)
     */
    toggleDeafen() {
        this.isDeafened = !this.isDeafened;
        
        // Mute/unmute all remote audio elements (correct approach)
        this.audioElements.forEach((audioElement, socketId) => {
            audioElement.muted = this.isDeafened;
            console.log(`🔊 Audio element for ${socketId} ${this.isDeafened ? 'muted' : 'unmuted'}`);
        });

        this._safeEmit('media-state-change', {
            isDeafened: this.isDeafened
        });
        
        return this.isDeafened;
    }

    /**
     * Locally mute/unmute a single remote participant's audio.
     * This only affects what THIS client hears - the other user is not notified.
     * @param {string} socketId
     * @param {boolean} [muted] - explicit value; if omitted, toggles current state
     * @returns {boolean} new muted state (true = muted)
     */
    setParticipantMuted(socketId, muted) {
        const audioElement = this.audioElements.get(socketId);
        if (!audioElement) {
            console.warn(`[WebRTC] No audio element for participant ${socketId}`);
            return false;
        }
        const newMuted = typeof muted === 'boolean' ? muted : !audioElement.muted;
        audioElement.muted = newMuted;
        console.log(`🔇 Participant ${socketId} locally ${newMuted ? 'muted' : 'unmuted'}`);
        return newMuted;
    }

    /**
     * Toggle video on/off
     */
    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                this.isVideoOn = videoTrack.enabled;

                this._safeEmit('media-state-change', {
                    isVideoOn: this.isVideoOn
                });
                
                return this.isVideoOn;
            }
        }
        return false;
    }

    /**
     * Handle remote media state changes
     */
    handleRemoteMediaStateChange({ socketId, isMuted, isVideoOn, isDeafened }) {
        console.log(`🎤 Remote media state - ${socketId}:`, { isMuted, isVideoOn, isDeafened });
        // UI updates handled by callback
    }

    /**
     * Create audio element for remote stream playback
     */
    createAudioElement(socketId, stream) {
        // Remove existing audio element if present
        this.removeAudioElement(socketId);
        
        // Create new audio element
        const audioElement = new Audio();
        audioElement.autoplay = true;
        audioElement.muted = this.isDeafened;
        audioElement.srcObject = stream;
        
        // Store audio element reference
        this.audioElements.set(socketId, audioElement);
        
        console.log(`🔊 Created audio element for ${socketId}, deafened: ${this.isDeafened}`);
        
        // Handle audio element errors
        audioElement.onerror = (error) => {
            console.error(`❌ Audio element error for ${socketId}:`, error);
        };
        
        // Ensure audio context is resumed for playback
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log('🔊 AudioContext resumed for remote audio playback');
            }).catch(err => {
                console.warn('⚠️ Failed to resume AudioContext:', err);
            });
        }
    }

    /**
     * Remove audio element for a participant
     */
    removeAudioElement(socketId) {
        const audioElement = this.audioElements.get(socketId);
        if (audioElement) {
            audioElement.pause();
            audioElement.srcObject = null;
            this.audioElements.delete(socketId);
            console.log(`🔊 Removed audio element for ${socketId}`);
        }
    }

    /**
     * Start voice activity detection
     */
    startVoiceActivityDetection() {
        if (!this.localStream) return;
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(this.localStream);
        
        microphone.connect(analyser);
        analyser.fftSize = 256;
        
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        let lastSpeakingState = false;
        
        this.voiceActivityInterval = setInterval(() => {
            analyser.getByteFrequencyData(dataArray);
            
            // Calculate average volume
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;
            
            // Threshold for speaking detection
            const isSpeaking = average > 20;
            
            if (isSpeaking !== lastSpeakingState) {
                lastSpeakingState = isSpeaking;
                this._safeEmit('voice-activity', { isSpeaking });

                if (this.onVoiceActivity) {
                    const selfId = (this.socket && this.socket.id) || 'local';
                    this.onVoiceActivity(selfId, isSpeaking);
                }
            }
        }, 100); // Check every 100ms
        
        this.audioAnalyser = audioContext;
    }

    /**
     * Stop voice activity detection
     */
    stopVoiceActivityDetection() {
        if (this.voiceActivityInterval) {
            clearInterval(this.voiceActivityInterval);
            this.voiceActivityInterval = null;
        }
        
        if (this.audioAnalyser) {
            this.audioAnalyser.close();
            this.audioAnalyser = null;
        }
    }

    /**
     * Handle remote voice activity
     */
    handleRemoteVoiceActivity({ socketId, isSpeaking }) {
        if (this.onVoiceActivity) {
            this.onVoiceActivity(socketId, isSpeaking);
        }
    }

    /**
     * Send chat message
     */
    sendMessage(text) {
        this._safeEmit('send-message', { text, type: 'text' });
    }

    /**
     * Send typing indicator
     */
    sendTyping(isTyping) {
        this._safeEmit('typing', { isTyping });
    }

    /**
     * Disconnect from signaling server
     */
    disconnect() {
        this.leaveRoom();
        if (this.socket) {
            this.socket.disconnect();
        }
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebRTCManager;
}
