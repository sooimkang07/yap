// ═══════════════════════════════════════════════════════
// yAp — Data Layer
// Supabase client + seeded data + DB helpers
// ═══════════════════════════════════════════════════════

// ── Supabase client ────────────────────────────────────
let supabaseClient = null;

function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[yAp] Supabase not configured — audio will not persist. Set SUPABASE_URL and SUPABASE_ANON_KEY in js/config.js');
    return false;
  }
  try {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('[yAp] Supabase connected');
    return true;
  } catch (e) {
    console.error('[yAp] Supabase init failed:', e);
    return false;
  }
}

function isSupabaseReady() {
  return !!supabaseClient;
}

function generateAppRecordId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function normalizePhoneNumber(value) {
  const digits = String(value || '').replace(/\D+/g, '');
  if (!digits) return '';
  if (digits.startsWith('1') && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return value.trim().startsWith('+') ? value.trim() : `+${digits}`;
}

function buildUserInitials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'Y';
  return words.slice(0, 2).map(word => word[0].toUpperCase()).join('');
}

function pickUserColor(name = '') {
  const palette = ['#B8D8FF', '#DEC0F8', '#FFDEB8', '#CBECCF', '#FFD6E7', '#FFE7B8'];
  const chars = Array.from(String(name));
  const score = chars.reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return palette[score % palette.length];
}

function parseVCardContacts(vcardText) {
  const cards = String(vcardText || '')
    .split(/END:VCARD/i)
    .map(block => block.trim())
    .filter(Boolean);

  return cards.map(card => {
    const nameMatch = card.match(/(?:^|\n)FN[^:]*:([^\n]+)/i);
    const telMatches = [...card.matchAll(/(?:^|\n)TEL[^:]*:([^\n]+)/ig)];
    const phone = telMatches
      .map(match => normalizePhoneNumber(match[1]))
      .find(Boolean);

    return {
      name: nameMatch?.[1]?.trim() || '',
      phone,
    };
  }).filter(contact => contact.phone);
}

function registerUserRecord(user) {
  if (!user?.id) return null;

  const normalized = {
    id: user.id,
    name: user.name || 'You',
    color: user.color || user.color_hex || pickUserColor(user.name),
    initials: user.initials || buildUserInitials(user.name),
    avatarUrl: user.avatarUrl || user.avatar_url || null,
    phoneE164: user.phoneE164 || user.phone_e164 || null,
    authUserId: user.authUserId || user.auth_user_id || null,
    profileCompleted: typeof user.profileCompleted === 'boolean'
      ? user.profileCompleted
      : !!user.profile_completed,
  };

  const existingKey = Object.keys(USERS).find(key => USERS[key]?.id === normalized.id);
  if (existingKey) {
    USERS[existingKey] = { ...USERS[existingKey], ...normalized };
    return USERS[existingKey];
  }

  const nextKeyBase = normalized.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || normalized.id;

  let nextKey = nextKeyBase;
  let suffix = 1;
  while (USERS[nextKey]) {
    suffix += 1;
    nextKey = `${nextKeyBase}-${suffix}`;
  }

  USERS[nextKey] = normalized;
  return normalized;
}

async function getAuthSession() {
  const localSession = getStoredAuthSession();
  if (localSession?.user?.phone) {
    return localSession;
  }

  if (!supabaseClient?.auth) return null;
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error('[yAp] auth getSession failed:', error);
    return null;
  }
  return data?.session || null;
}

async function sendPhoneOtp(phone) {
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!normalizedPhone) throw new Error('Enter a valid phone number.');

  try {
    const response = await fetch(YAP_SEND_PHONE_CODE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: normalizedPhone }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const hint = payload?.hint ? ` ${payload.hint}` : '';
      throw new Error((payload?.error || 'We could not send a verification code right now.') + hint);
    }

    return normalizedPhone;
  } catch (error) {
    const isNetworkFailure = error instanceof TypeError;
    if (!isNetworkFailure || !supabaseClient?.auth) throw error;

    const { error: fallbackError } = await supabaseClient.auth.signInWithOtp({
      phone: normalizedPhone,
      options: {
        shouldCreateUser: true,
      },
    });

    if (fallbackError) throw fallbackError;
    return normalizedPhone;
  }
}

async function verifyPhoneOtp(phone, token) {
  const normalizedPhone = normalizePhoneNumber(phone);
  const normalizedToken = String(token || '').trim();
  if (!normalizedPhone || normalizedToken.length < 6) {
    throw new Error('Enter the 6-digit code we texted you.');
  }

  try {
    const response = await fetch(YAP_VERIFY_PHONE_CODE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: normalizedPhone,
        code: normalizedToken,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const hint = payload?.hint ? ` ${payload.hint}` : '';
      throw new Error((payload?.error || 'That code did not work. Try again.') + hint);
    }

    const localSession = {
      provider: 'twilio-verify',
      verifiedAt: Date.now(),
      user: {
        phone: normalizedPhone,
      },
    };
    setStoredAuthSession(localSession);
    return localSession;
  } catch (error) {
    const isNetworkFailure = error instanceof TypeError;
    if (!isNetworkFailure || !supabaseClient?.auth) throw error;

    const { data, error: fallbackError } = await supabaseClient.auth.verifyOtp({
      phone: normalizedPhone,
      token: normalizedToken,
      type: 'sms',
    });

    if (fallbackError) throw fallbackError;
    if (data?.session) setStoredAuthSession(data.session);
    return data?.session || null;
  }
}

async function getAppUserByAuthUserId(authUserId) {
  if (!supabaseClient || !authUserId) return null;

  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (error) {
    console.error('[yAp] getAppUserByAuthUserId failed:', error);
    return null;
  }

  return data ? registerUserRecord(data) : null;
}

async function getAppUserByPhone(phone) {
  if (!supabaseClient || !phone) return null;
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!normalizedPhone) return null;

  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('phone_e164', normalizedPhone)
    .maybeSingle();

  if (error) {
    console.error('[yAp] getAppUserByPhone failed:', error);
    return null;
  }

  return data ? registerUserRecord(data) : null;
}

async function ensureAppUserFromAuthSession(session) {
  const authUser = session?.user;
  if (!supabaseClient || !authUser) return null;

  const authUserId = authUser.id || null;
  const phone = normalizePhoneNumber(authUser.phone || authUser.user_metadata?.phone || '');
  let appUser = authUserId ? await getAppUserByAuthUserId(authUserId) : null;

  if (!appUser && phone) {
    appUser = await getAppUserByPhone(phone);
  }

  if (appUser) {
    const updatePayload = {
      phone_e164: phone || appUser.phoneE164 || null,
      updated_at: new Date().toISOString(),
    };
    if (authUserId) {
      updatePayload.auth_user_id = authUserId;
    }

    const { data, error } = await supabaseClient
      .from('users')
      .update(updatePayload)
      .eq('id', appUser.id)
      .select()
      .single();

    if (error) {
      console.error('[yAp] ensureAppUserFromAuthSession update failed:', error);
      setStoredAuthSession({
        ...session,
        appUserId: appUser.id,
      });
      return appUser;
    }

    setStoredAuthSession({
      ...session,
      appUserId: data.id,
      user: {
        ...session.user,
        phone,
      },
    });
    return registerUserRecord(data);
  }

  const baseInsert = {
    id: generateAppRecordId('user'),
    name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'You',
    color_hex: pickUserColor(authUser.phone || authUser.id || ''),
    avatar_url: authUser.user_metadata?.avatar_url || null,
  };
  const fullInsert = {
    ...baseInsert,
    phone_e164: phone || null,
    initials: buildUserInitials(baseInsert.name),
    profile_completed: false,
  };
  if (authUserId) fullInsert.auth_user_id = authUserId;

  let { data, error } = await supabaseClient.from('users').insert(fullInsert).select().single();

  if (error?.message?.includes('schema cache')) {
    ({ data, error } = await supabaseClient.from('users').insert(baseInsert).select().single());
  }

  if (error) {
    console.error('[yAp] ensureAppUserFromAuthSession insert failed:', error);
    const fallback = registerUserRecord({ ...fullInsert, profile_completed: false });
    if (fallback) setStoredAuthSession({ ...session, appUserId: fallback.id });
    return fallback;
  }

  setStoredAuthSession({
    ...session,
    appUserId: data.id,
    user: { ...session.user, phone },
  });
  return registerUserRecord(data);
}

async function saveUserProfile({ userId, authUserId, name, avatarUrl, phone }) {
  if (!supabaseClient || !userId || !name) throw new Error('Missing user profile details.');

  // Try the full payload first (requires migrate.sql to have been run).
  // On any schema-cache miss, fall back to the 4 columns guaranteed in the original table.
  const base = { id: userId, name: name.trim(), color_hex: pickUserColor(name), avatar_url: avatarUrl || null };
  const full = {
    ...base,
    phone_e164: normalizePhoneNumber(phone) || null,
    initials: buildUserInitials(name),
    profile_completed: true,
    updated_at: new Date().toISOString(),
  };
  if (authUserId) full.auth_user_id = authUserId;

  let { data, error } = await supabaseClient.from('users').upsert(full, { onConflict: 'id' }).select().single();

  if (error?.message?.includes('schema cache')) {
    ({ data, error } = await supabaseClient.from('users').upsert(base, { onConflict: 'id' }).select().single());
  }

  if (error) throw error;
  const saved = registerUserRecord({ ...data, phone_e164: normalizePhoneNumber(phone) || null });
  if (saved) saved.profileCompleted = true;
  return saved;
}

async function signOutAuthSession() {
  setStoredAuthSession(null);
  if (!supabaseClient?.auth) return true;
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
  return true;
}

async function renameChat(chatId, name) {
  if (!supabaseClient || !chatId || !name) throw new Error('Missing chat details.');

  const { data, error } = await supabaseClient
    .from('chats')
    .update({
      name: String(name).trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', chatId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getInvitationsForChat(chatId) {
  if (!supabaseClient || !chatId) return [];

  const { data, error } = await supabaseClient
    .from('invitations')
    .select('*')
    .eq('chat_id', chatId)
    .in('status', ['pending', 'sent'])
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[yAp] getInvitationsForChat failed:', error);
    return [];
  }

  return data || [];
}

async function addMembersToChat({ chatId, ownerUserId, members }) {
  if (!supabaseClient || !chatId || !ownerUserId) throw new Error('Missing chat details.');

  const normalizedMembers = (Array.isArray(members) ? members : [])
    .map(member => ({
      name: String(member?.name || '').trim(),
      phone: normalizePhoneNumber(member?.phone),
    }))
    .filter(member => member.phone);

  if (!normalizedMembers.length) {
    throw new Error('Add at least one valid phone number.');
  }

  const { data: existingMatches, error: existingError } = await supabaseClient
    .from('users')
    .select('*')
    .in('phone_e164', normalizedMembers.map(member => member.phone));

  if (existingError) throw existingError;

  const existingByPhone = new Map(
    (existingMatches || []).map(user => {
      const registeredUser = registerUserRecord(user);
      return [registeredUser.phoneE164, registeredUser];
    })
  );

  const participantRows = [];
  const inviteRows = [];

  for (const member of normalizedMembers) {
    const matchedUser = existingByPhone.get(member.phone);
    if (matchedUser) {
      participantRows.push({
        chat_id: chatId,
        user_id: matchedUser.id,
        role: 'member',
        invite_status: 'joined',
        invited_by: ownerUserId,
      });
    } else {
      inviteRows.push({
        id: generateAppRecordId('invite'),
        chat_id: chatId,
        inviter_id: ownerUserId,
        invitee_name: member.name || null,
        phone_e164: member.phone,
        invite_token: crypto.randomUUID(),
        status: 'pending',
      });
    }
  }

  if (participantRows.length) {
    const { error: participantError } = await supabaseClient
      .from('chat_participants')
      .upsert(participantRows, { onConflict: 'chat_id,user_id' });
    if (participantError) throw participantError;
  }

  if (inviteRows.length) {
    const { error: inviteError } = await supabaseClient
      .from('invitations')
      .insert(inviteRows);
    if (inviteError) throw inviteError;

    const inviteResults = await sendInviteMessages({
      chatName: AppState?.activeChat?.name || 'yAp group',
      inviterName: getCurrentUser().name,
      invites: inviteRows,
    });
    await updateInvitationStatuses(inviteResults);
  }

  const manualContactRows = normalizedMembers.map(member => ({
    owner_user_id: ownerUserId,
    source: 'manual',
    display_name: member.name || member.phone,
    phone_e164: member.phone,
    matched_user_id: existingByPhone.get(member.phone)?.id || null,
    invited_chat_id: chatId,
  }));

  if (manualContactRows.length) {
    await supabaseClient.from('imported_contacts').insert(manualContactRows);
  }

  return {
    addedUsers: participantRows.map(row => getUserById(row.user_id)).filter(Boolean),
    invitesCreated: inviteRows.length,
  };
}

async function resendInvitation(invite) {
  if (!invite?.id || !invite?.phone_e164) throw new Error('Missing invite details.');
  const results = await sendInviteMessages({
    chatName: AppState?.activeChat?.name || 'yAp group',
    inviterName: getCurrentUser().name,
    invites: [invite],
  });
  await updateInvitationStatuses(results);
  return results[0] || null;
}

async function revokeInvitation(inviteId) {
  if (!supabaseClient || !inviteId) throw new Error('Missing invitation.');
  const { error } = await supabaseClient
    .from('invitations')
    .update({
      status: 'revoked',
      updated_at: new Date().toISOString(),
    })
    .eq('id', inviteId);
  if (error) throw error;
  return true;
}

async function leaveChat(chatId, userId) {
  if (!supabaseClient || !chatId || !userId) throw new Error('Missing membership details.');

  const { error } = await supabaseClient
    .from('chat_participants')
    .update({
      invite_status: 'left',
      updated_at: new Date().toISOString(),
    })
    .eq('chat_id', chatId)
    .eq('user_id', userId);

  if (error) throw error;
  return true;
}

async function removeMemberFromChat(chatId, userId) {
  if (!supabaseClient || !chatId || !userId) throw new Error('Missing membership details.');

  const { error } = await supabaseClient
    .from('chat_participants')
    .update({
      invite_status: 'removed',
      updated_at: new Date().toISOString(),
    })
    .eq('chat_id', chatId)
    .eq('user_id', userId);

  if (error) throw error;
  return true;
}

async function getNotificationRecipients(chatId, excludeUserId) {
  if (!supabaseClient || !chatId) return [];

  const { data, error } = await supabaseClient
    .from('chat_participants')
    .select('user_id, users(id, name, phone_e164)')
    .eq('chat_id', chatId)
    .eq('invite_status', 'joined');

  if (error) {
    console.warn('[yAp] getNotificationRecipients failed:', error);
    return [];
  }

  return (data || [])
    .map(entry => entry.users)
    .filter(Boolean)
    .filter(user => user.id !== excludeUserId && user.phone_e164)
    .map(user => ({
      id: user.id,
      name: user.name,
      phone_e164: user.phone_e164,
    }));
}

async function sendMessageNotifications({ chatId, chatName, senderName, recipients, threadLabel, transcript, isReply }) {
  if (!Array.isArray(recipients) || !recipients.length) return [];

  const response = await fetch(YAP_SEND_MESSAGE_NOTIFICATIONS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chatId,
      chatName,
      senderName,
      recipients,
      threadLabel,
      transcript,
      isReply: !!isReply,
      baseUrl: window.location.origin + window.location.pathname,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || 'Message notifications failed.');
  }

  return Array.isArray(payload?.results) ? payload.results : [];
}

async function sendInviteMessages({ chatName, inviterName, invites }) {
  if (!Array.isArray(invites) || !invites.length) return [];

  const response = await fetch(YAP_SEND_INVITES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chatName,
      inviterName,
      baseUrl: window.location.origin + window.location.pathname,
      invites: invites.map(invite => ({
        id: invite.id,
        invite_token: invite.invite_token,
        phone_e164: invite.phone_e164,
        invitee_name: invite.invitee_name,
      })),
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || 'Invite delivery failed.');
  }

  return Array.isArray(payload?.results) ? payload.results : [];
}

async function updateInvitationStatuses(results) {
  if (!supabaseClient || !Array.isArray(results) || !results.length) return;

  await Promise.all(results.map(async result => {
    if (!result?.id || !result?.status) return;

    const { error } = await supabaseClient
      .from('invitations')
      .update({
        status: result.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', result.id);

    if (error) {
      console.warn('[yAp] Invitation status update failed:', error);
    }
  }));
}

async function acceptInviteToken(inviteToken, acceptedByUserId) {
  if (!supabaseClient || !inviteToken || !acceptedByUserId) return null;

  const { data: invite, error: inviteError } = await supabaseClient
    .from('invitations')
    .select('*')
    .eq('invite_token', inviteToken)
    .maybeSingle();

  if (inviteError) throw inviteError;
  if (!invite) return null;

  const { error: participantError } = await supabaseClient
    .from('chat_participants')
    .upsert({
      chat_id: invite.chat_id,
      user_id: acceptedByUserId,
      role: 'member',
      invited_by: invite.inviter_id,
      invite_status: 'joined',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'chat_id,user_id' });

  if (participantError) throw participantError;

  const { error: inviteUpdateError } = await supabaseClient
    .from('invitations')
    .update({
      status: 'accepted',
      accepted_by: acceptedByUserId,
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', invite.id);

  if (inviteUpdateError) throw inviteUpdateError;

  return invite.chat_id;
}

async function saveImportedContacts(ownerUserId, contacts, source = 'icloud_vcard') {
  if (!supabaseClient || !ownerUserId || !Array.isArray(contacts) || !contacts.length) return [];

  const rows = contacts.map(contact => ({
    owner_user_id: ownerUserId,
    source,
    display_name: contact.name || contact.phone,
    phone_e164: normalizePhoneNumber(contact.phone),
  })).filter(contact => contact.phone_e164);

  if (!rows.length) return [];

  const { data, error } = await supabaseClient
    .from('imported_contacts')
    .insert(rows)
    .select();

  if (error) {
    console.warn('[yAp] saveImportedContacts failed:', error);
    return [];
  }

  return data || [];
}

async function getImportedContactsForUser(ownerUserId) {
  if (!supabaseClient || !ownerUserId) return [];

  const { data: contacts, error } = await supabaseClient
    .from('imported_contacts')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[yAp] getImportedContactsForUser failed:', error);
    return [];
  }

  const phoneNumbers = [...new Set((contacts || []).map(contact => contact.phone_e164).filter(Boolean))];
  const { data: users, error: usersError } = phoneNumbers.length
    ? await supabaseClient
        .from('users')
        .select('*')
        .in('phone_e164', phoneNumbers)
    : { data: [], error: null };

  if (usersError) {
    console.warn('[yAp] getImportedContactsForUser user match failed:', usersError);
  }

  const usersByPhone = new Map((users || []).map(user => {
    const normalizedUser = registerUserRecord(user);
    return [normalizedUser.phoneE164, normalizedUser];
  }));

  return (contacts || []).map(contact => {
    const matchedUser = usersByPhone.get(contact.phone_e164) || null;
    return {
      ...contact,
      matched_user_id: contact.matched_user_id || matchedUser?.id || null,
      matchedUser,
    };
  });
}

async function getChatsForUser(userId) {
  if (!supabaseClient || !userId) return [];

  const { data: memberships, error: membershipError } = await supabaseClient
    .from('chat_participants')
    .select('chat_id, role, invite_status, chats(id, name, created_at, created_by, avatar_url, updated_at)')
    .eq('user_id', userId)
    .in('invite_status', ['joined', 'pending']);

  if (membershipError) {
    console.error('[yAp] getChatsForUser memberships failed:', membershipError);
    return [];
  }

  const chatIds = (memberships || []).map(entry => entry.chat_id).filter(Boolean);
  if (!chatIds.length) return [];

  const { data: participants, error: participantError } = await supabaseClient
    .from('chat_participants')
    .select('chat_id, user_id, role, invite_status, users(id, name, color_hex, avatar_url, initials, phone_e164, profile_completed, auth_user_id)')
    .in('chat_id', chatIds)
    .eq('invite_status', 'joined');

  if (participantError) {
    console.error('[yAp] getChatsForUser participants failed:', participantError);
    return [];
  }

  const { data: voiceMessages, error: messagesError } = await supabaseClient
    .from('voice_messages')
    .select('id, chat_id, author_id, playback_progress(user_id, heard)')
    .in('chat_id', chatIds);

  if (messagesError) {
    console.warn('[yAp] getChatsForUser unread query failed:', messagesError);
  }

  const participantsByChat = new Map();
  for (const entry of participants || []) {
    const members = participantsByChat.get(entry.chat_id) || [];
    const user = registerUserRecord(entry.users);
    members.push(user);
    participantsByChat.set(entry.chat_id, members);
  }

  const unreadByChat = new Map();
  for (const message of voiceMessages || []) {
    if (message.author_id === userId) continue;
    const progress = Array.isArray(message.playback_progress)
      ? message.playback_progress.find(entry => entry.user_id === userId)
      : null;
    if (progress?.heard) continue;
    unreadByChat.set(message.chat_id, (unreadByChat.get(message.chat_id) || 0) + 1);
  }

  return (memberships || [])
    .map(entry => {
      const chat = entry.chats;
      if (!chat) return null;

      return {
        id: chat.id,
        name: chat.name,
        emoji: null,
        members: participantsByChat.get(chat.id) || [],
        unread: unreadByChat.get(chat.id) || 0,
        active: true,
        visual: chat.id === ACTIVE_CHAT_ID ? 'besties' : 'default',
        avatarUrl: chat.avatar_url || null,
        createdBy: chat.created_by || null,
      };
    })
    .filter(Boolean);
}

async function createGroupChat({ ownerUserId, name, members }) {
  if (!supabaseClient) throw new Error('Supabase is not configured yet.');
  if (!ownerUserId) throw new Error('Sign in before creating a group.');

  const normalizedName = String(name || '').trim();
  if (!normalizedName) throw new Error('Give your group a name.');

  const normalizedMembers = (Array.isArray(members) ? members : [])
    .map(member => ({
      name: String(member?.name || '').trim(),
      phone: normalizePhoneNumber(member?.phone),
    }))
    .filter(member => member.phone);

  if (!normalizedMembers.length) {
    throw new Error('Add at least one friend by phone number.');
  }

  const chatId = generateAppRecordId('chat');
  const inviteRows = [];
  const participantRows = [{
    chat_id: chatId,
    user_id: ownerUserId,
    role: 'owner',
    invite_status: 'joined',
  }];

  const [owner, existingMatches] = await Promise.all([
    getUserById(ownerUserId) || null,
    supabaseClient
      .from('users')
      .select('*')
      .in('phone_e164', normalizedMembers.map(member => member.phone)),
  ]);

  const existingByPhone = new Map(
    ((existingMatches.data || [])).map(user => {
      const registeredUser = registerUserRecord(user);
      return [registeredUser.phoneE164, registeredUser];
    })
  );

  for (const member of normalizedMembers) {
    const matchedUser = existingByPhone.get(member.phone);
    if (matchedUser) {
      participantRows.push({
        chat_id: chatId,
        user_id: matchedUser.id,
        role: 'member',
        invite_status: 'joined',
        invited_by: ownerUserId,
      });
    } else {
      inviteRows.push({
        id: generateAppRecordId('invite'),
        chat_id: chatId,
        inviter_id: ownerUserId,
        invitee_name: member.name || null,
        phone_e164: member.phone,
        invite_token: crypto.randomUUID(),
        status: 'pending',
      });
    }
  }

  let { error: chatError } = await supabaseClient
    .from('chats').insert({ id: chatId, name: normalizedName, created_by: ownerUserId });
  if (chatError?.message?.includes('schema cache')) {
    ({ error: chatError } = await supabaseClient.from('chats').insert({ id: chatId, name: normalizedName }));
  }
  if (chatError) throw chatError;

  let { error: participantError } = await supabaseClient.from('chat_participants').insert(participantRows);
  if (participantError?.message?.includes('schema cache')) {
    ({ error: participantError } = await supabaseClient
      .from('chat_participants')
      .insert(participantRows.map(r => ({ chat_id: r.chat_id, user_id: r.user_id }))));
  }
  if (participantError) throw participantError;

  let smsWarning = null;

  if (inviteRows.length) {
    const { error: inviteError } = await supabaseClient
      .from('invitations')
      .insert(inviteRows);

    if (inviteError) {
      console.error('[yAp] invitations insert failed:', inviteError.message);
      smsWarning = inviteError.message;
    } else {
      try {
        const inviteResults = await sendInviteMessages({
          chatName: normalizedName,
          inviterName: getCurrentUser().name,
          invites: inviteRows,
        });
        console.log('[yAp] invite SMS results:', JSON.stringify(inviteResults));
        await updateInvitationStatuses(inviteResults);

        const failed = inviteResults.filter(r => r.status !== 'sent');
        if (failed.length) {
          smsWarning = `SMS failed for ${failed.length} contact(s): ${failed.map(r => r.error).join('; ')}`;
          console.warn('[yAp] some invites failed:', smsWarning);
        }
      } catch (smsErr) {
        smsWarning = smsErr.message;
        console.error('[yAp] sendInviteMessages error:', smsErr.message);
      }
    }
  }

  // imported_contacts is also optional — warn and continue if table missing.
  const manualContactRows = normalizedMembers.map(member => ({
    owner_user_id: ownerUserId,
    source: 'manual',
    display_name: member.name || member.phone,
    phone_e164: member.phone,
    matched_user_id: existingByPhone.get(member.phone)?.id || null,
    invited_chat_id: chatId,
  }));

  if (manualContactRows.length) {
    const { error: contactsError } = await supabaseClient
      .from('imported_contacts')
      .insert(manualContactRows);

    if (contactsError) {
      console.warn('[yAp] imported_contacts insert skipped:', contactsError.message);
    }
  }

  const membersForChat = [owner || getCurrentUser()].concat(
    participantRows
      .filter(entry => entry.user_id !== ownerUserId)
      .map(entry => getUserById(entry.user_id))
      .filter(Boolean)
  );

  return {
    id: chatId,
    name: normalizedName,
    members: membersForChat,
    unread: 0,
    active: true,
    visual: 'default',
    pendingInvites: inviteRows,
    smsWarning,
  };
}

// ── Seeded local data ──────────────────────────────────
const FIGMA_ASSETS = {
  sooimAvatar: 'assets/sooim.jpg',
  chloeAvatar: 'https://www.figma.com/api/mcp/asset/99057606-1c1b-40c1-a2fc-c23fda030a0b',
  mariaAvatar: 'https://www.figma.com/api/mcp/asset/97cb42aa-cce6-4334-98ec-baee923c114c',
  musicLeague: 'https://www.figma.com/api/mcp/asset/9a786041-43ad-46c6-bbd2-e06d9598e266',
  sooma: 'https://www.figma.com/api/mcp/asset/f151cf2d-bd6e-48e3-9a1c-7ed8af6f5f1c',
};

const USERS = {
  sooim: {
    id:       'user-sooim-000000000001',
    name:     'sooim',
    color:    '#B8D8FF',
    initials: 'S',
    avatarUrl: FIGMA_ASSETS.sooimAvatar,
  },
  chloe: {
    id:       'user-chloe-000000000002',
    name:     'Chloe',
    color:    '#DEC0F8',
    initials: 'C',
    avatarUrl: FIGMA_ASSETS.chloeAvatar,
  },
  maria: {
    id:       'user-maria-000000000003',
    name:     'Maria',
    color:    '#FFDEB8',
    initials: 'M',
    avatarUrl: FIGMA_ASSETS.mariaAvatar,
  },
};

const CHATS = [
  {
    id:      ACTIVE_CHAT_ID,
    name:    'besties 💛',
    emoji:   null,
    members: [USERS.sooim, USERS.chloe, USERS.maria],
    unread:  0,
    active:  true,   // navigates into chat
    visual:  'besties',
  },
];

const LEGACY_DEMO_TRANSCRIPTS = new Set([
  'what are you up to this weekend',
  'something funny happened today',
  'hey what are you guys up to this weekend? also wanted to tell you about something funny that happened today.',
]);

// ── DB helpers ─────────────────────────────────────────

/**
 * Upload audio blob to Supabase Storage and insert a voice_messages row.
 * Returns { messageId, audioUrl } on success, or null if Supabase is not configured.
 */
async function saveVoiceMessage(chatId, authorId, audioBlob, durationMs) {
  if (!supabaseClient) {
    console.warn('[yAp] saveVoiceMessage: Supabase not configured, skipping DB write');
    return null;
  }

  const messageId = crypto.randomUUID();
  const ext = audioBlob.type.includes('mp4') ? 'mp4' : 'webm';
  const storagePath = `${chatId}/${messageId}.${ext}`;

  // 1. Upload to Storage
  const { error: uploadErr } = await supabaseClient.storage
    .from('voice-messages')
    .upload(storagePath, audioBlob, {
      contentType: audioBlob.type,
      upsert: false,
    });

  if (uploadErr) {
    console.error('[yAp] Storage upload failed:', uploadErr);
    return null;
  }

  // 2. Create a signed URL for immediate playback. The stored DB value remains the path.
  const audioUrl = await createSignedAudioUrl(storagePath);

  // 3. Insert voice_messages row
  const { data, error: insertErr } = await supabaseClient
    .from('voice_messages')
    .insert({
      id:          messageId,
      chat_id:     chatId,
      author_id:   authorId,
      audio_url:   storagePath,
      duration_ms: durationMs,
      status:      'processing',
    })
    .select()
    .single();

  if (insertErr) {
    console.error('[yAp] DB insert failed:', insertErr);
    return null;
  }

  console.log('[yAp] Voice message saved:', data);
  return { messageId: data.id, audioUrl, audioPath: storagePath };
}

async function saveTranscriptRecord(voiceMessageId, transcriptText, wordTimestamps = null) {
  if (!supabaseClient || !voiceMessageId || !transcriptText) return null;

  const { data, error } = await supabaseClient
    .from('transcripts')
    .insert({
      voice_message_id: voiceMessageId,
      full_text: transcriptText,
      word_timestamps: wordTimestamps,
    })
    .select()
    .single();

  if (error) {
    console.error('[yAp] Transcript insert failed:', error);
    return null;
  }

  return data;
}

async function ensureTopicThread(thread) {
  if (!supabaseClient || !thread) return null;

  const payload = {
    id: thread.id,
    chat_id: thread.chatId,
    label: thread.label,
    last_activity_at: new Date(thread.lastActivityAt || Date.now()).toISOString(),
  };

  const { error } = await supabaseClient
    .from('topic_threads')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('[yAp] Topic thread upsert failed:', error);
    return null;
  }

  return thread.id;
}

async function saveTopicSegmentRecord({ voiceMessageId, topicThreadId, label, transcript, startMs, endMs }) {
  if (!supabaseClient || !voiceMessageId || !topicThreadId || !transcript) return null;

  const { data, error } = await supabaseClient
    .from('topic_segments')
    .insert({
      voice_message_id: voiceMessageId,
      topic_thread_id: topicThreadId,
      label,
      transcript,
      start_ms: startMs || 0,
      end_ms: endMs || 0,
    })
    .select()
    .single();

  if (error) {
    console.error('[yAp] Topic segment insert failed:', error);
    return null;
  }

  return data;
}

async function markVoiceMessageDone(messageId) {
  if (!supabaseClient || !messageId) return null;

  const { error } = await supabaseClient
    .from('voice_messages')
    .update({ status: 'done' })
    .eq('id', messageId);

  if (error) {
    console.error('[yAp] Voice message status update failed:', error);
    return null;
  }

  return true;
}

async function markVoiceMessageFailed(messageId) {
  if (!supabaseClient || !messageId) return null;

  const { error } = await supabaseClient
    .from('voice_messages')
    .update({ status: 'failed' })
    .eq('id', messageId);

  if (error) {
    console.error('[yAp] Voice message failure update failed:', error);
    return null;
  }

  return true;
}

async function saveGeneratedReply({ chatId, threadId, authorId, audioBlob, durationMs, transcript, label }) {
  if (!supabaseClient || !chatId || !threadId || !authorId || !audioBlob || !transcript) return null;

  const messageId = crypto.randomUUID();
  const storagePath = `${chatId}/generated/${messageId}.mp3`;

  const { error: uploadErr } = await supabaseClient.storage
    .from('voice-messages')
    .upload(storagePath, audioBlob, {
      contentType: audioBlob.type || 'audio/mpeg',
      upsert: true,
    });

  if (uploadErr) {
    console.error('[yAp] Generated reply upload failed:', uploadErr);
    return null;
  }

  const audioUrl = await createSignedAudioUrl(storagePath);

  const { error: insertErr } = await supabaseClient
    .from('voice_messages')
    .insert({
      id: messageId,
      chat_id: chatId,
      author_id: authorId,
      audio_url: storagePath,
      duration_ms: durationMs,
      status: 'done',
    });

  if (insertErr) {
    console.error('[yAp] Generated reply DB insert failed:', insertErr);
    return null;
  }

  await saveTopicSegmentRecord({
    voiceMessageId: messageId,
    topicThreadId: threadId,
    label,
    transcript,
    startMs: 0,
    endMs: durationMs,
  });

  return { messageId, audioUrl, audioPath: storagePath };
}

async function persistReplyAudioForMessage({ chatId, voiceMessageId, audioBlob, durationMs }) {
  if (!supabaseClient || !chatId || !voiceMessageId || !audioBlob) return null;

  const storagePath = `${chatId}/generated/${voiceMessageId}.mp3`;

  const { error: uploadErr } = await supabaseClient.storage
    .from('voice-messages')
    .upload(storagePath, audioBlob, {
      contentType: audioBlob.type || 'audio/mpeg',
      upsert: true,
    });

  if (uploadErr) {
    console.error('[yAp] Reply audio backfill upload failed:', uploadErr);
    return null;
  }

  const audioUrl = await createSignedAudioUrl(storagePath);

  const { error: updateErr } = await supabaseClient
    .from('voice_messages')
    .update({
      audio_url: storagePath,
      duration_ms: durationMs || null,
      status: 'done',
    })
    .eq('id', voiceMessageId);

  if (updateErr) {
    console.error('[yAp] Reply audio backfill DB update failed:', updateErr);
    return null;
  }

  return { audioUrl, audioPath: storagePath };
}

async function savePlaybackProgressRecord({ userId, voiceMessageId, heard, playedMs }) {
  if (!supabaseClient || !userId || !voiceMessageId) return null;

  const { error } = await supabaseClient
    .from('playback_progress')
    .upsert({
      user_id: userId,
      voice_message_id: voiceMessageId,
      heard: !!heard,
      played_ms: playedMs || 0,
      last_heard_at: heard ? new Date().toISOString() : null,
    });

  if (error) {
    console.error('[yAp] Playback progress upsert failed:', error);
    return null;
  }

  return true;
}

async function getVoiceMessages(chatId) {
  if (!supabaseClient || !chatId) return [];

  const { data, error } = await supabaseClient
    .from('voice_messages')
    .select(`
      *,
      transcripts(*),
      topic_segments(*),
      playback_progress(*)
    `)
    .eq('chat_id', chatId)
    .order('sent_at', { ascending: true });

  if (error) {
    console.error('[yAp] getVoiceMessages:', error);
    return [];
  }

  return data || [];
}

async function createSignedAudioUrl(storagePath, expiresIn = 60 * 60) {
  if (!supabaseClient || !storagePath) return null;
  if (!looksLikeStoragePath(storagePath)) return storagePath;

  const { data, error } = await supabaseClient.storage
    .from('voice-messages')
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.error('[yAp] Signed URL creation failed:', error);
    return null;
  }

  return data?.signedUrl || null;
}

function looksLikeStoragePath(value) {
  return typeof value === 'string' && !/^https?:\/\//i.test(value);
}

async function ensureMessageAudioUrl(message) {
  if (!message) return null;

  if (!message.audioPath && looksLikeStoragePath(message.audioUrl)) {
    message.audioPath = message.audioUrl;
    message.audioUrl = null;
  }

  const expiresSoon = message.audioSignedAt
    ? (Date.now() - message.audioSignedAt) > 45 * 60 * 1000
    : true;

  if (message.audioUrl && !message.audioPath) return message.audioUrl;
  if (message.audioUrl && !message.audioSignedAt) return message.audioUrl;
  if (message.audioUrl && !expiresSoon) return message.audioUrl;
  if (!message.audioPath) return message.audioUrl || null;

  const signedUrl = await createSignedAudioUrl(message.audioPath);
  if (!signedUrl) return null;

  message.audioUrl = signedUrl;
  message.audioSignedAt = Date.now();
  return signedUrl;
}

// ── In-memory Store ────────────────────────────────────
// Mirrors the DB schema shape. Populated by pipeline.js.
// Shape of each thread:
//   { id, chatId, label, transcript, createdAt,
//     messages: [{ id, threadId, authorId, author, audioUrl, durationMs, label, transcript, startMs, sentAt }] }

const Store = {
  threads: [],

  clear() { this.threads = []; },

  addThread(thread) {
    const normalized = this._normalizeThread(thread);
    this.threads.push(normalized);
  },

  addMessage(threadId, message) {
    const t = this.threads.find(t => t.id === threadId);
    if (t) {
      t.messages.push(this._normalizeMessage(message));
      t.lastActivityAt = message.sentAt || Date.now();
      this._recalculateThreadState(t);
    }
  },

  updateThread(threadId, patch = {}) {
    const t = this.threads.find(t => t.id === threadId);
    if (!t) return null;
    Object.assign(t, patch);
    this._recalculateThreadState(t);
    return t;
  },

  getThreads()          {
    return [...this.threads].sort((a, b) =>
      (b.unheardCount || 0) - (a.unheardCount || 0) ||
      (b.lastHeardAt || 0) - (a.lastHeardAt || 0) ||
      (b.lastActivityAt || b.createdAt || 0) - (a.lastActivityAt || a.createdAt || 0)
    );
  },
  getThread(threadId)   { return this.threads.find(t => t.id === threadId); },
  hasThreads() { return this.threads.length > 0; },
  findMessage(messageId) {
    for (const thread of this.threads) {
      const message = thread.messages.find(msg => msg.id === messageId);
      if (message) return { thread, message };
    }
    return null;
  },
  findPlayableItem(itemId) {
    for (const thread of this.threads) {
      const message = thread.messages.find(msg => msg.id === itemId);
      if (message) return { thread, item: message, type: 'message' };

      if (thread.parentMemoMessage?.id === itemId) {
        return { thread, item: thread.parentMemoMessage, type: 'parentMemo' };
      }
    }
    return null;
  },
  markMessageHeard(messageId, playedMs = 0) {
    const found = this.findMessage(messageId);
    if (!found) return null;

    const { thread, message } = found;
    if (message.authorId === getCurrentUserId()) return found;

    message.heardByCurrentUser = true;
    message.playedMs = Math.max(playedMs || 0, message.durationMs || 0);
    message.heardAt = Date.now();
    thread.lastHeardAt = message.heardAt;
    this._recalculateThreadState(thread);

    return found;
  },
  _normalizeThread(thread) {
    const normalized = {
      ...thread,
      messages: Array.isArray(thread.messages) ? thread.messages.map(message => this._normalizeMessage(message)) : [],
      parentMemoMessage: thread.parentMemoMessage ? this._normalizeMessage(thread.parentMemoMessage) : null,
      lastHeardAt: thread.lastHeardAt || null,
      unheardCount: thread.unheardCount || 0,
    };

    this._recalculateThreadState(normalized);
    return normalized;
  },
  _normalizeMessage(message) {
    const isCurrentUser = message.authorId === getCurrentUserId();
    const startMs = Math.max(0, Number(message.startMs) || 0);
    const rawDurationMs = Math.max(0, Number(message.durationMs) || 0);
    const endMs = Math.max(startMs, Number(message.endMs) || (startMs + rawDurationMs));
    const durationMs = Math.max(0, endMs - startMs) || rawDurationMs;
    return {
      ...message,
      voiceMessageId: message.voiceMessageId || message.id,
      audioPath: message.audioPath || (looksLikeStoragePath(message.audioUrl) ? message.audioUrl : null),
      audioUrl: looksLikeStoragePath(message.audioUrl) ? null : (message.audioUrl || null),
      audioBlob: message.audioBlob || null,
      audioSignedAt: message.audioSignedAt || null,
      startMs,
      endMs,
      durationMs,
      heardByCurrentUser: typeof message.heardByCurrentUser === 'boolean'
        ? message.heardByCurrentUser
        : isCurrentUser,
      playedMs: message.playedMs || 0,
      heardAt: message.heardAt || null,
    };
  },
  _recalculateThreadState(thread) {
    const currentUserId = getCurrentUserId();
    const heardMessages = thread.messages.filter(message => message.heardByCurrentUser && message.authorId !== currentUserId);
    const unheardMessages = thread.messages.filter(message => !message.heardByCurrentUser && message.authorId !== currentUserId);

    thread.unheardCount = unheardMessages.length;
    thread.lastHeardAt = heardMessages.length
      ? Math.max(...heardMessages.map(message => message.heardAt || 0))
      : thread.lastHeardAt || null;
    thread.hasHeardContext = heardMessages.length > 0;
  },
};

async function getTopicThreads(chatId) {
  if (!supabaseClient) return [];
  const { data, error } = await supabaseClient
    .from('topic_threads')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[yAp] getTopicThreads:', error);
    return [];
  }

  return data || [];
}

async function hydrateChatFromSupabase(chatId) {
  if (!supabaseClient || !chatId) return [];

  const [topicThreads, voiceMessages] = await Promise.all([
    getTopicThreads(chatId),
    getVoiceMessages(chatId),
  ]);

  const threadMap = new Map(
    topicThreads.map(thread => [thread.id, {
      id: thread.id,
      chatId: thread.chat_id,
      label: thread.label,
      excerpt: '',
      transcript: '',
      rangeLabel: '',
      parentMemoId: null,
      parentMemoMessage: null,
      createdAt: new Date(thread.created_at).getTime(),
      lastActivityAt: new Date(thread.last_activity_at).getTime(),
      lastHeardAt: null,
      unheardCount: 0,
      messages: [],
    }])
  );

  const sortedMessages = [...voiceMessages].sort((a, b) =>
    new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
  );

  for (const voiceMessage of sortedMessages) {
    const author = Object.values(USERS).find(user => user.id === voiceMessage.author_id) || USERS.sooim;
    const progress = Array.isArray(voiceMessage.playback_progress)
      ? voiceMessage.playback_progress.find(entry => entry.user_id === getCurrentUserId())
      : null;
    const segments = Array.isArray(voiceMessage.topic_segments)
      ? [...voiceMessage.topic_segments].sort((a, b) => a.start_ms - b.start_ms)
      : [];

    for (let index = 0; index < segments.length; index++) {
      const segment = segments[index];
      if (!segment.topic_thread_id) continue;

      const thread = threadMap.get(segment.topic_thread_id) || {
        id: segment.topic_thread_id,
        chatId,
        label: segment.label,
        excerpt: '',
        transcript: '',
        rangeLabel: '',
        parentMemoId: null,
        parentMemoMessage: null,
        createdAt: new Date(voiceMessage.sent_at).getTime(),
        lastActivityAt: new Date(voiceMessage.sent_at).getTime(),
        lastHeardAt: null,
        unheardCount: 0,
        messages: [],
      };

      const durationMs = Math.max(
        0,
        (segment.end_ms || 0) - (segment.start_ms || 0)
      ) || voiceMessage.duration_ms || 0;
      const sentAt = new Date(voiceMessage.sent_at).getTime() + index;

      const message = {
        id: `${voiceMessage.id}-seg-${segment.id}`,
        voiceMessageId: voiceMessage.id,
        threadId: thread.id,
        authorId: voiceMessage.author_id,
        author,
        audioPath: looksLikeStoragePath(voiceMessage.audio_url) ? voiceMessage.audio_url : null,
        audioUrl: looksLikeStoragePath(voiceMessage.audio_url) ? null : (voiceMessage.audio_url || null),
        durationMs,
        label: segment.label || clipWords(segment.transcript, 8),
        transcript: segment.transcript,
        excerpt: clipWords(segment.transcript, 8),
        startMs: segment.start_ms || 0,
        endMs: segment.end_ms || durationMs,
        sentAt,
        parentMemoId: voiceMessage.id,
        heardByCurrentUser: voiceMessage.author_id === getCurrentUserId() ? true : !!progress?.heard,
        playedMs: progress?.played_ms || 0,
        heardAt: progress?.last_heard_at ? new Date(progress.last_heard_at).getTime() : null,
      };

      thread.messages.push(message);
      thread.lastActivityAt = Math.max(thread.lastActivityAt || 0, sentAt);

      if (!thread.parentMemoId && voiceMessage.author_id === getCurrentUserId()) {
        thread.parentMemoId = voiceMessage.id;
        thread.excerpt = clipWords(segment.transcript, 8);
        thread.transcript = segment.transcript;
        thread.rangeLabel = `${formatDurationClock(segment.start_ms)}-${formatDurationClock(segment.end_ms)}`;
        thread.parentMemoMessage = {
          id: `memo-${thread.id}-${voiceMessage.id}`,
          voiceMessageId: voiceMessage.id,
          threadId: thread.id,
          authorId: voiceMessage.author_id,
          author,
          audioPath: looksLikeStoragePath(voiceMessage.audio_url) ? voiceMessage.audio_url : null,
          audioUrl: looksLikeStoragePath(voiceMessage.audio_url) ? null : (voiceMessage.audio_url || null),
          durationMs: voiceMessage.duration_ms || durationMs,
          label: 'Full memo',
          transcript: '',
          excerpt: '',
          startMs: 0,
          endMs: voiceMessage.duration_ms || durationMs,
          sentAt: new Date(voiceMessage.sent_at).getTime(),
          parentMemoId: voiceMessage.id,
          heardByCurrentUser: true,
        };
      }

      threadMap.set(thread.id, thread);
    }
  }

  const hydratedThreads = [...threadMap.values()]
    .map(thread => ({
      ...thread,
      messages: thread.messages.sort((a, b) => a.sentAt - b.sentAt),
      excerpt: thread.excerpt || clipWords(thread.messages[0]?.transcript || '', 8),
      transcript: thread.transcript || thread.messages[0]?.transcript || '',
      rangeLabel: thread.rangeLabel || `${formatDurationClock(thread.messages[0]?.startMs || 0)}-${formatDurationClock(thread.messages[0]?.endMs || 0)}`,
      parentMemoId: thread.parentMemoId || thread.messages[0]?.voiceMessageId || null,
      parentMemoMessage: thread.parentMemoMessage || null,
    }))
    .filter(thread => isVisibleConversationThread(thread))
    .sort((a, b) => (b.lastActivityAt || 0) - (a.lastActivityAt || 0));

  const audioHydrationJobs = [];
  for (const thread of hydratedThreads) {
    if (thread.parentMemoMessage?.audioPath) {
      audioHydrationJobs.push(ensureMessageAudioUrl(thread.parentMemoMessage));
    }
    for (const message of thread.messages) {
      if (message.audioPath) {
        audioHydrationJobs.push(ensureMessageAudioUrl(message));
      }
    }
  }

  await Promise.all(audioHydrationJobs);

  Store.clear();
  hydratedThreads.forEach(thread => Store.addThread(thread));
  return Store.getThreads();
}

function clipDebugText(text, maxWords = 24) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return words.slice(0, maxWords).join(' ') + '...';
}

function isVisibleConversationThread(thread) {
  if (!thread || !Array.isArray(thread.messages) || thread.messages.length === 0) return false;

  const userMessages = thread.messages.filter(message => message.authorId === getCurrentUserId());
  if (!userMessages.length) return false;

  return !userMessages.every(message => isLegacyDemoText(message.transcript) || isLegacyDemoText(message.label));
}

function isLegacyDemoText(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized ? LEGACY_DEMO_TRANSCRIPTS.has(normalized) : false;
}
