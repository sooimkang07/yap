'use client'

import { useState } from 'react'
import LandingPage from '@/components/LandingPage'
import ChatsPage from '@/components/ChatsPage'
import ConversationPage from '@/components/ConversationPage'

type Screen = 'landing' | 'chats' | 'conversation'

export default function DemoPage() {
  const [screen, setScreen] = useState<Screen>('landing')

  if (screen === 'conversation') {
    return <ConversationPage onBack={() => setScreen('chats')} />
  }

  if (screen === 'chats') {
    return <ChatsPage onOpenChat={() => setScreen('conversation')} />
  }

  return (
    <LandingPage
      onLogin={() => setScreen('chats')}
      onSignup={() => setScreen('chats')}
    />
  )
}
