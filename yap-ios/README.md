# yAp iOS

This folder is the native iPhone app source scaffold for the one-week migration.

It is intentionally kept separate from the current web app so the native client can move fast without dragging browser UI assumptions with it.

## What To Do Next
1. Create a new SwiftUI iOS app project in Xcode named `yAp`.
2. Copy these folders into the Xcode project.
3. Add the files to the app target.
4. Set your backend base URL in `Config/AppConfig.swift`.
5. Sign with your personal Apple ID team and run on your iPhone.

## Initial Native Scope
- phone auth
- profile bootstrap
- contacts import
- chats list
- new group
- chat
- voice record/send/play

## Folder Structure
- `App`: app entry and route shell
- `Config`: environment and endpoints
- `Core`: shared design system, models, services, utilities
- `Features`: screen-specific flows
- `Resources`: assets to import into Xcode

