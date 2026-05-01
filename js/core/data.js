// ═══════════════════════════════════════════════════════
// yAp — Data Layer
// Supabase client + seeded data + DB helpers
// ═══════════════════════════════════════════════════════

// ── Supabase client ────────────────────────────────────
let supabaseClient = null;

function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[yAp] Supabase not configured — audio will not persist. Set SUPABASE_URL and SUPABASE_ANON_KEY in js/core/config.js');
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

function makeUuid() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join('-');
}

function generateAppRecordId(prefix) {
  return `${prefix}-${makeUuid()}`;
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
  const activeCurrentUserId = typeof getCurrentUserId === 'function' ? getCurrentUserId() : null;
  const isCurrentUserRecord = user.id === activeCurrentUserId
    || user.id === APP_DEFAULT_CURRENT_USER_ID
    || user.auth_user_id === getStoredAuthSession?.()?.user?.id;
  const fallbackName = isCurrentUserRecord
    ? 'You'
    : (user.phoneE164 || user.phone_e164 || 'Friend');
  const resolvedName = user.name || fallbackName;

  const normalized = {
    id: user.id,
    name: resolvedName,
    color: user.color || user.color_hex || pickUserColor(resolvedName),
    initials: user.initials || buildUserInitials(resolvedName),
    avatarUrl: isCurrentUserRecord
      ? (user.avatarUrl || user.avatar_url || 'assets/sooim.jpg')
      : (user.avatarUrl || user.avatar_url || null),
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

async function fetchBackendReadiness() {
  try {
    const response = await fetch(YAP_HEALTH_ENDPOINT, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || 'Backend health check failed.');
    }

    return payload;
  } catch (error) {
    console.warn('[yAp] backend readiness check failed:', error);
    return null;
  }
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
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(5);

  if (error) {
    console.error('[yAp] getAppUserByAuthUserId failed:', error);
    return null;
  }

  const rows = Array.isArray(data) ? data : (data ? [data] : []);
  const chosen = rows.sort((a, b) => {
    const aScore = (a?.profile_completed ? 4 : 0) + (a?.phone_e164 ? 2 : 0) + (a?.auth_user_id ? 1 : 0);
    const bScore = (b?.profile_completed ? 4 : 0) + (b?.phone_e164 ? 2 : 0) + (b?.auth_user_id ? 1 : 0);
    if (bScore !== aScore) return bScore - aScore;
    return new Date(b?.updated_at || b?.created_at || 0).getTime() - new Date(a?.updated_at || a?.created_at || 0).getTime();
  })[0];

  return chosen ? registerUserRecord(chosen) : null;
}

async function getAppUserByPhone(phone) {
  if (!supabaseClient || !phone) return null;
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!normalizedPhone) return null;

  const { data, error } = await supabaseClient
    .from('users')
    .select('*')
    .eq('phone_e164', normalizedPhone)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(5);

  if (error) {
    console.error('[yAp] getAppUserByPhone failed:', error);
    return null;
  }

  const rows = Array.isArray(data) ? data : (data ? [data] : []);
  const chosen = rows.sort((a, b) => {
    const aScore = (a?.profile_completed ? 4 : 0) + (a?.auth_user_id ? 2 : 0) + (a?.avatar_url ? 1 : 0);
    const bScore = (b?.profile_completed ? 4 : 0) + (b?.auth_user_id ? 2 : 0) + (b?.avatar_url ? 1 : 0);
    if (bScore !== aScore) return bScore - aScore;
    return new Date(b?.updated_at || b?.created_at || 0).getTime() - new Date(a?.updated_at || a?.created_at || 0).getTime();
  })[0];

  return chosen ? registerUserRecord(chosen) : null;
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
    return null;
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
  const normalizedPhone = normalizePhoneNumber(phone) || null;
  const existingByAuth = authUserId ? await getAppUserByAuthUserId(authUserId) : null;
  const existingByPhone = normalizedPhone ? await getAppUserByPhone(normalizedPhone) : null;
  const canonicalUser = existingByAuth || existingByPhone || null;
  const targetUserId = canonicalUser?.id || userId;

  // Try the full payload first (requires migrate.sql to have been run).
  // On any schema-cache miss, fall back to the 4 columns guaranteed in the original table.
  const base = { id: targetUserId, name: name.trim(), color_hex: pickUserColor(name), avatar_url: avatarUrl || null };
  const full = {
    ...base,
    phone_e164: normalizedPhone,
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
  const saved = registerUserRecord({ ...data, phone_e164: normalizedPhone });
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
  const unmatchedMembers = [];

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
      unmatchedMembers.push(member);
    }
  }

  if (unmatchedMembers.length) {
    const labels = unmatchedMembers.map(member => member.name || member.phone).join(', ');
    throw new Error(`${labels} ${unmatchedMembers.length === 1 ? 'is' : 'are'} not on yAp yet. Right now you can only add registered users.`);
  }

  if (participantRows.length) {
    const { error: participantError } = await supabaseClient
      .from('chat_participants')
      .upsert(participantRows, { onConflict: 'chat_id,user_id' });
    if (participantError) throw participantError;
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
    const { error: contactsError } = await supabaseClient
      .from('imported_contacts')
      .insert(manualContactRows);

    if (contactsError) {
      console.warn('[yAp] imported_contacts insert skipped:', contactsError.message);
    }
  }

  return {
    addedUsers: participantRows.map(row => getUserById(row.user_id)).filter(Boolean),
    invitesCreated: 0,
    smsWarning: null,
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
  const fallbackRecipients = (AppState?.activeChat?.members || [])
    .filter(member => member?.id !== excludeUserId && member?.phoneE164)
    .map(member => ({
      id: member.id,
      name: member.name || '',
      phone_e164: member.phoneE164,
    }));

  if (!supabaseClient || !chatId) return dedupeNotificationRecipients(fallbackRecipients);

  const { data, error } = await supabaseClient
    .from('chat_participants')
    .select('user_id, users(id, name, phone_e164)')
    .eq('chat_id', chatId)
    .eq('invite_status', 'joined');

  if (error) {
    console.warn('[yAp] getNotificationRecipients failed:', error);
    return dedupeNotificationRecipients(fallbackRecipients);
  }

  const joinedRecipients = (data || [])
    .map(entry => entry.users)
    .filter(Boolean)
    .filter(user => user.id !== excludeUserId && user.phone_e164)
    .map(user => ({
      id: user.id,
      name: user.name,
      phone_e164: user.phone_e164,
    }));

  return dedupeNotificationRecipients([...joinedRecipients, ...fallbackRecipients]);
}

function dedupeNotificationRecipients(recipients = []) {
  const seen = new Set();
  return recipients.filter(recipient => {
    const phone = recipient?.phone_e164 || '';
    if (!phone || seen.has(phone)) return false;
    seen.add(phone);
    return true;
  });
}

async function sendMessageNotifications({ chatId, chatName, senderName, recipients, threadLabel, transcript, isReply, kind }) {
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
      kind: String(kind || '').trim() || 'message',
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

async function acceptInviteToken(inviteToken, acceptedByUserId, acceptedByPhone = '') {
  if (!supabaseClient || !inviteToken || !acceptedByUserId) return null;

  const { data: invite, error: inviteError } = await supabaseClient
    .from('invitations')
    .select('*')
    .eq('invite_token', inviteToken)
    .maybeSingle();

  if (inviteError) throw inviteError;
  if (!invite) return null;
  if (invite.status === 'revoked' || invite.status === 'expired') {
    throw new Error('This invite is no longer active.');
  }
  if (invite.status === 'accepted' && invite.accepted_by && invite.accepted_by !== acceptedByUserId) {
    throw new Error('This invite was already used on another account.');
  }

  const normalizedInvitePhone = normalizePhoneNumber(invite.phone_e164 || '');
  const normalizedAcceptedPhone = normalizePhoneNumber(acceptedByPhone || '');
  if (normalizedInvitePhone && normalizedAcceptedPhone && normalizedInvitePhone !== normalizedAcceptedPhone) {
    throw new Error('This invite was sent to a different phone number.');
  }

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

async function getRegisteredUserByPhone(phone) {
  try {
    return await getAppUserByPhone(phone);
  } catch (error) {
    console.warn('[yAp] getRegisteredUserByPhone failed:', error);
    return null;
  }
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

  // Also fetch pending invitations so not-yet-registered invitees show as members.
  const { data: pendingInvitations, error: inviteError } = await supabaseClient
    .from('invitations')
    .select('chat_id, invitee_name, phone_e164, invite_token')
    .in('chat_id', chatIds)
    .in('status', ['pending', 'sent']);

  if (inviteError) {
    console.warn('[yAp] getChatsForUser invitations query failed:', inviteError);
  }

  const { data: voiceMessages, error: messagesError } = await supabaseClient
    .from('voice_messages')
    .select(`
      id,
      chat_id,
      author_id,
      sent_at,
      playback_progress(user_id, heard),
      transcripts(full_text),
      topic_segments(label, transcript)
    `)
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

  // Add pending invitees as placeholder members.
  for (const invite of pendingInvitations || []) {
    const members = participantsByChat.get(invite.chat_id) || [];
    members.push({
      id: `pending-${invite.invite_token}`,
      name: invite.invitee_name || invite.phone_e164,
      initials: buildUserInitials(invite.invitee_name || invite.phone_e164),
      color: pickUserColor(invite.phone_e164),
      avatarUrl: null,
      phoneE164: invite.phone_e164,
      pending: true,
    });
    participantsByChat.set(invite.chat_id, members);
  }

  const unreadByChat = new Map();
  const latestMessageByChat = new Map();
  for (const message of voiceMessages || []) {
    const sentAt = message.sent_at ? new Date(message.sent_at).getTime() : 0;
    const latest = latestMessageByChat.get(message.chat_id);
    if (!latest || sentAt > latest.sentAt) {
      latestMessageByChat.set(message.chat_id, {
        sentAt,
        authorId: message.author_id,
        preview: buildChatPreview(message),
      });
    }

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
        currentUserRole: entry.role || 'member',
        lastMessageAt: latestMessageByChat.get(chat.id)?.sentAt || (chat.updated_at ? new Date(chat.updated_at).getTime() : 0),
        preview: latestMessageByChat.get(chat.id)?.preview || '',
        previewAuthorId: latestMessageByChat.get(chat.id)?.authorId || null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
}

function buildChatPreview(message) {
  const segment = Array.isArray(message?.topic_segments)
    ? message.topic_segments.find(entry => entry?.transcript || entry?.label)
    : null;
  const transcript = Array.isArray(message?.transcripts)
    ? message.transcripts.find(entry => entry?.full_text)?.full_text
    : '';

  const text = segment?.transcript || segment?.label || transcript || 'Voice memo';
  return clipWords(text, 12);
}

async function createGroupChat({ ownerUserId, name, members }) {
  if (!supabaseClient) throw new Error('Supabase is not configured yet.');
  if (!ownerUserId) throw new Error('Sign in before creating a group.');

  const normalizedMembers = (Array.isArray(members) ? members : [])
    .map(member => ({
      name: String(member?.name || '').trim(),
      phone: normalizePhoneNumber(member?.phone),
    }))
    .filter(member => member.phone);

  if (!normalizedMembers.length) {
    throw new Error('Add at least one friend by phone number.');
  }

  const normalizedName = String(name || '').trim() || normalizedMembers
    .map(member => member.name || member.phone)
    .filter(Boolean)
    .slice(0, 3)
    .join(', ');

  const chatId = generateAppRecordId('chat');
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

  const unmatchedMembers = [];

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
      unmatchedMembers.push(member);
    }
  }

  if (unmatchedMembers.length) {
    const labels = unmatchedMembers.map(member => member.name || member.phone).join(', ');
    throw new Error(`${labels} ${unmatchedMembers.length === 1 ? 'is' : 'are'} not on yAp yet. Right now you can only create chats with registered users.`);
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
    createdBy: ownerUserId,
    currentUserRole: 'owner',
    lastMessageAt: Date.now(),
    localCreatedAt: Date.now(),
    preview: '',
    previewAuthorId: null,
    pendingInvites: [],
    smsWarning: null,
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
    createdBy: USERS.sooim.id,
    currentUserRole: 'owner',
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

  const messageId = makeUuid();
  const ext = inferAudioFileExtension(audioBlob.type);
  const storagePath = `${chatId}/${messageId}.${ext}`;
  const contentType = audioBlob.type || inferAudioMimeType(ext);
  let persistedAudioRef = storagePath;
  let audioUrl = null;

  // 1. Upload to Storage
  const { error: uploadErr } = await supabaseClient.storage
    .from('voice-messages')
    .upload(storagePath, audioBlob, {
      contentType,
      upsert: false,
    });

  if (uploadErr) {
    console.warn('[yAp] Storage upload failed, falling back to inline audio:', uploadErr);
    persistedAudioRef = await blobToDataUrl(audioBlob);
  } else {
    // 2. Create a signed URL for immediate playback. The stored DB value remains the path.
    audioUrl = await createSignedAudioUrl(storagePath);
    if (!audioUrl) {
      persistedAudioRef = await blobToDataUrl(audioBlob);
    }
  }

  // 3. Insert voice_messages row
  const { data, error: insertErr } = await supabaseClient
    .from('voice_messages')
    .insert({
      id:          messageId,
      chat_id:     chatId,
      author_id:   authorId,
      audio_url:   persistedAudioRef,
      duration_ms: durationMs,
      status:      'processing',
    })
    .select()
    .single();

  if (insertErr) {
    console.error('[yAp] DB insert failed:', insertErr);
    throw new Error(`Voice memo save failed: ${insertErr.message || 'database insert failed'}`);
  }

  console.log('[yAp] Voice message saved:', data);
  return {
    messageId: data.id,
    audioUrl: audioUrl || persistedAudioRef,
    audioPath: persistedAudioRef === storagePath ? storagePath : null,
  };
}

function inferAudioFileExtension(mimeType = '') {
  const normalized = String(mimeType || '').toLowerCase();
  if (normalized.includes('mp4') || normalized.includes('m4a') || normalized.includes('aac')) return 'm4a';
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'mp3';
  if (normalized.includes('ogg')) return 'ogg';
  if (normalized.includes('wav')) return 'wav';
  return 'webm';
}

function inferAudioMimeType(extension = '') {
  switch (String(extension || '').toLowerCase()) {
    case 'm4a':
      return 'audio/mp4';
    case 'mp3':
      return 'audio/mpeg';
    case 'ogg':
      return 'audio/ogg';
    case 'wav':
      return 'audio/wav';
    default:
      return 'audio/webm';
  }
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

  const messageId = makeUuid();
  const storagePath = `${chatId}/generated/${messageId}.mp3`;
  let persistedAudioRef = storagePath;

  const { error: uploadErr } = await supabaseClient.storage
    .from('voice-messages')
    .upload(storagePath, audioBlob, {
      contentType: audioBlob.type || 'audio/mpeg',
      upsert: true,
    });

  if (uploadErr) {
    console.warn('[yAp] Generated reply upload failed, falling back to inline audio:', uploadErr);
    persistedAudioRef = await blobToDataUrl(audioBlob);
  }

  let audioUrl = persistedAudioRef === storagePath
    ? await createSignedAudioUrl(storagePath)
    : persistedAudioRef;
  if (persistedAudioRef === storagePath && !audioUrl) {
    persistedAudioRef = await blobToDataUrl(audioBlob);
    audioUrl = persistedAudioRef;
  }

  const { error: insertErr } = await supabaseClient
    .from('voice_messages')
    .insert({
      id: messageId,
      chat_id: chatId,
      author_id: authorId,
      audio_url: persistedAudioRef,
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

  return { messageId, audioUrl, audioPath: persistedAudioRef === storagePath ? storagePath : null };
}

async function persistReplyAudioForMessage({ chatId, voiceMessageId, audioBlob, durationMs }) {
  if (!supabaseClient || !chatId || !voiceMessageId || !audioBlob) return null;

  const storagePath = `${chatId}/generated/${voiceMessageId}.mp3`;
  let persistedAudioRef = storagePath;

  const { error: uploadErr } = await supabaseClient.storage
    .from('voice-messages')
    .upload(storagePath, audioBlob, {
      contentType: audioBlob.type || 'audio/mpeg',
      upsert: true,
    });

  if (uploadErr) {
    console.warn('[yAp] Reply audio backfill upload failed, falling back to inline audio:', uploadErr);
    persistedAudioRef = await blobToDataUrl(audioBlob);
  }

  let audioUrl = persistedAudioRef === storagePath
    ? await createSignedAudioUrl(storagePath)
    : persistedAudioRef;
  if (persistedAudioRef === storagePath && !audioUrl) {
    persistedAudioRef = await blobToDataUrl(audioBlob);
    audioUrl = persistedAudioRef;
  }

  const { error: updateErr } = await supabaseClient
    .from('voice_messages')
    .update({
      audio_url: persistedAudioRef,
      duration_ms: durationMs || null,
      status: 'done',
    })
    .eq('id', voiceMessageId);

  if (updateErr) {
    console.error('[yAp] Reply audio backfill DB update failed:', updateErr);
    return null;
  }

  return { audioUrl, audioPath: persistedAudioRef === storagePath ? storagePath : null };
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
  return typeof value === 'string' && !/^(?:https?:|blob:|data:)/i.test(value);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error('Failed to read audio blob'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });
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
  activeChatId: null,
  chatThreads: new Map(),

  clear(chatId = null) {
    if (chatId) {
      this.chatThreads.delete(chatId);
      if (this.activeChatId === chatId) this.threads = [];
      return;
    }
    this.threads = [];
    this.activeChatId = null;
    this.chatThreads.clear();
  },

  setActiveChat(chatId) {
    this.activeChatId = chatId || null;
    this.threads = this._cloneThreads(this.chatThreads.get(chatId) || []);
    return this.getThreads();
  },

  getCachedThreads(chatId) {
    return this._cloneThreads(this.chatThreads.get(chatId) || []);
  },

  replaceThreads(chatId, threads = []) {
    const normalizedThreads = this._cloneThreads(threads);
    this.chatThreads.set(chatId, normalizedThreads);
    if (this.activeChatId === chatId) {
      this.threads = this._cloneThreads(normalizedThreads);
    }
    return this.getThreads();
  },

  addThread(thread) {
    const normalized = this._normalizeThread(thread);
    this.threads.push(normalized);
    this._syncActiveChatCache();
  },

  addMessage(threadId, message) {
    const t = this.threads.find(t => t.id === threadId);
    if (t) {
      t.messages.push(this._normalizeMessage(message));
      t.lastActivityAt = message.sentAt || Date.now();
      this._recalculateThreadState(t);
      this._syncActiveChatCache();
    }
  },

  updateThread(threadId, patch = {}) {
    const t = this.threads.find(t => t.id === threadId);
    if (!t) return null;
    Object.assign(t, patch);
    this._recalculateThreadState(t);
    this._syncActiveChatCache();
    return t;
  },

  getThreads()          {
    return [...this.threads].sort((a, b) =>
      (a.createdAt || a.lastActivityAt || 0) - (b.createdAt || b.lastActivityAt || 0) ||
      (a.lastActivityAt || 0) - (b.lastActivityAt || 0)
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
  _cloneThreads(threads = []) {
    return threads.map(thread => this._normalizeThread(thread));
  },
  _syncActiveChatCache() {
    if (!this.activeChatId) return;
    this.chatThreads.set(this.activeChatId, this._cloneThreads(this.threads));
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

  const cachedThreads = Store.getCachedThreads(chatId);

  const [topicThreads, voiceMessages, participantRows] = await Promise.all([
    getTopicThreads(chatId),
    getVoiceMessages(chatId),
    supabaseClient
      .from('chat_participants')
      .select('user_id')
      .eq('chat_id', chatId)
      .eq('invite_status', 'joined'),
  ]);

  const joinedParticipantIds = new Set(
    ((participantRows?.data || [])).map(row => row.user_id).filter(Boolean)
  );
  const safeVoiceMessages = (voiceMessages || []).filter(message => {
    const authorId = message?.author_id;
    return !authorId || !joinedParticipantIds.size || joinedParticipantIds.has(authorId);
  });

  const authorIds = [...new Set(safeVoiceMessages.map(message => message.author_id).filter(Boolean))];
  const authorsById = new Map();
  if (authorIds.length) {
    const { data: authors } = await supabaseClient
      .from('users')
      .select('*')
      .in('id', authorIds);

    for (const authorRecord of authors || []) {
      const author = registerUserRecord(authorRecord);
      if (author) authorsById.set(author.id, author);
    }
  }

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

  const sortedMessages = [...safeVoiceMessages].sort((a, b) =>
    new Date(a.sent_at).getTime() - new Date(b.sent_at).getTime()
  );

  for (const voiceMessage of sortedMessages) {
    const author = authorsById.get(voiceMessage.author_id) || getUserById(voiceMessage.author_id) || getCurrentUser();
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

  if (!hydratedThreads.length && cachedThreads.length) {
    return Store.replaceThreads(chatId, cachedThreads);
  }

  return Store.replaceThreads(chatId, hydratedThreads);
}

function clipDebugText(text, maxWords = 24) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return words.slice(0, maxWords).join(' ') + '...';
}

function isVisibleConversationThread(thread) {
  if (!thread || !Array.isArray(thread.messages) || thread.messages.length === 0) return false;
  if (thread.messages.every(message => isLegacyDemoText(message.transcript) || isLegacyDemoText(message.label))) {
    return false;
  }
  return true;
}

function isLegacyDemoText(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized ? LEGACY_DEMO_TRANSCRIPTS.has(normalized) : false;
}
