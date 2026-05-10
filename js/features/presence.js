// ═══════════════════════════════════════════════════════
// yAp — Presence & Live Status Tracking
// Real-time user online status, recording state, typing indicators
// ═══════════════════════════════════════════════════════

const PresenceManager = {
  // Track active users by userId
  activeUsers: new Map(),

  // Track recording state by userId
  recordingStates: new Map(),

  // Supabase subscription
  subscription: null,

  // Current user presence channel
  presenceChannel: null,

  // Callbacks for UI updates
  onPresenceChange: [],
  onRecordingChange: [],

  // ── Initialize presence tracking ────────────────────────────────────
  async init(chatId) {
    if (!isSupabaseReady()) return;

    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      // Subscribe to presence for this chat
      this.presenceChannel = supabaseClient
        .channel(`presence:${chatId}`, {
          config: {
            presence: {
              key: userId,
            },
          },
        })
        .on('presence', { event: 'sync' }, () => {
          this._syncPresence(chatId);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          this._handlePresenceJoin(key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          this._handlePresenceLeave(key, leftPresences);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Broadcast current user as online with idle state
            await this.presenceChannel.track({
              user_id: userId,
              status: 'online',
              recording_state: 'idle',
              updated_at: new Date().toISOString(),
            });
          }
        });

      console.log('[yAp] Presence tracking initialized for chat:', chatId);
    } catch (error) {
      console.error('[yAp] Presence init failed:', error);
    }
  },

  // ── Broadcast recording state change ────────────────────────────────
  async setRecordingState(state) {
    if (!this.presenceChannel) return;

    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      await this.presenceChannel.track({
        user_id: userId,
        status: 'online',
        recording_state: state, // idle | recording | sending
        updated_at: new Date().toISOString(),
      });

      this.recordingStates.set(userId, state);
      this._notifyRecordingChange();
    } catch (error) {
      console.error('[yAp] Failed to update recording state:', error);
    }
  },

  // ── Sync presence from server ───────────────────────────────────────
  _syncPresence(chatId) {
    if (!this.presenceChannel) return;

    const presences = this.presenceChannel.presenceState();
    this.activeUsers.clear();
    this.recordingStates.clear();

    Object.entries(presences).forEach(([key, users]) => {
      users.forEach((user) => {
        const userId = user.user_id || key;
        this.activeUsers.set(userId, {
          userId,
          status: user.status || 'offline',
          recordingState: user.recording_state || 'idle',
          lastUpdated: user.updated_at || Date.now(),
        });

        if (user.recording_state && user.recording_state !== 'idle') {
          this.recordingStates.set(userId, user.recording_state);
        }
      });
    });

    this._notifyPresenceChange();
  },

  _handlePresenceJoin(key, newPresences) {
    newPresences.forEach((user) => {
      const userId = user.user_id || key;
      this.activeUsers.set(userId, {
        userId,
        status: 'online',
        recordingState: user.recording_state || 'idle',
        lastUpdated: user.updated_at || Date.now(),
      });
    });
    this._notifyPresenceChange();
  },

  _handlePresenceLeave(key, leftPresences) {
    leftPresences.forEach((user) => {
      const userId = user.user_id || key;
      this.activeUsers.delete(userId);
      this.recordingStates.delete(userId);
    });
    this._notifyPresenceChange();
  },

  // ── Check if user is live ───────────────────────────────────────────
  isUserLive(userId) {
    return this.activeUsers.has(userId);
  },

  // ── Get user's recording state ──────────────────────────────────────
  getUserRecordingState(userId) {
    return this.recordingStates.get(userId) || 'idle';
  },

  // ── Get all live users ──────────────────────────────────────────────
  getLiveUsers() {
    return Array.from(this.activeUsers.values());
  },

  // ── Get users currently recording ────────────────────────────────────
  getRecordingUsers() {
    return Array.from(this.recordingStates.entries())
      .filter(([, state]) => state !== 'idle')
      .map(([userId, state]) => ({ userId, state }));
  },

  // ── Register UI update callback ──────────────────────────────────────
  onPresenceUpdate(callback) {
    this.onPresenceChange.push(callback);
  },

  onRecordingUpdate(callback) {
    this.onRecordingChange.push(callback);
  },

  // ── Notify listeners of presence changes ─────────────────────────────
  _notifyPresenceChange() {
    this.onPresenceChange.forEach(callback => {
      try {
        callback(this.getLiveUsers());
      } catch (error) {
        console.error('[yAp] Presence callback error:', error);
      }
    });
  },

  _notifyRecordingChange() {
    this.onRecordingChange.forEach(callback => {
      try {
        callback(this.getRecordingUsers());
      } catch (error) {
        console.error('[yAp] Recording callback error:', error);
      }
    });
  },

  // ── Cleanup ──────────────────────────────────────────────────────────
  async cleanup() {
    if (this.presenceChannel) {
      try {
        await supabaseClient.removeChannel(this.presenceChannel);
      } catch (error) {
        console.warn('[yAp] Presence cleanup error:', error);
      }
      this.presenceChannel = null;
    }
    this.activeUsers.clear();
    this.recordingStates.clear();
    this.onPresenceChange = [];
    this.onRecordingChange = [];
  },
};
