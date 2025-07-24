# Frontend Plan for Finance-AI Mockup (React Web with Tailwind CSS)

## 1. Overview
The web client will be built with **React 18** (Vite) and rely exclusively on **TanStack Query** for server-state management/fetching and **TanStack Router** for navigation. Styling is handled by **Tailwind CSS** with first-class dark-mode support. All communication with the backend occurs over HTTPS (REST) and secure WebSockets.

## 2. Technology Stack
* **Build Tool**: Vite 5 + React 18 + TypeScript 5
* **State / Data**: TanStack Query v5 (QueryClient with persistent cache)
* **Routing**: TanStack Router v1 (file-less route tree)
* **Charts**: `recharts` (line, pie, bar)
* **WebSocket Client**: native `WebSocket` API wrapped in custom hook
* **Forms & Validation**: `react-hook-form` + `zod`
* **Styling**: Tailwind CSS (JIT), dark-mode via `class` strategy
* **Auth Storage**: browser `localStorage` (Base64 Basic-Auth creds)
* **Testing**: Vitest + React Testing Library + `@tanstack/react-query/testing`

## 3. App Architecture
```mermaid
flowchart TD
  subgraph Browser
    direction TB
    Router[TanStack Router]\n(Route Tree)
    Pages[Page Components]
    UI[Shared UI]
  end
  Router --> Pages --> UI
  Pages --> QueryClient[TanStack Query Client]
  QueryClient -- REST/WS --> API[Backend]
```

### Route Tree Sketch
```text
/           → <RootLayout>
  /login    → <LoginPage>
  /dashboard
    /charts        → <ChartsLayout>
      /charts/line
      /charts/pie
      /charts/bar
    /chat          → <ChatPage>
    /profits       → <ProfitPage>
```

## 4. Feature Details
1. **Authentication**
   * Login page submits Basic Auth credentials via `mutation`.
   * On success, Base64-encoded creds persisted in `localStorage` & placed in an **axios fetch function** header for subsequent requests.
   * React Context wrapper exposes `useAuth` hook for easy access/refresh.
2. **Charts Module**
   * Each chart page establishes a WebSocket connection to `/charts/{type}`.
   * Custom hook `useChartStream(type, interval)` manages socket lifecycle and pushes data into TanStack Query cache via `setQueryData`.
   * `recharts` renders the data; refresh interval adjustable via UI slider (controlled component synced to URL search param).
3. **Chat Module**
   * Hook `useChatSocket()` maintains a WebSocket; inbound/outbound messages stored in a `messages` query.
   * Optimistic UI by adding user message to cache before server echo.
4. **Profit Table Module**
   * `useInfiniteQuery` consumes paginated `/profits` endpoint.
   * Tailwind table with sticky headers & responsive design.
   * Year/company filters bound to TanStack Router search params (e.g., `?company=Alpha&year=2023`).

## 5. TanStack Query Strategy
* Global `QueryClient` created in `main.tsx` with `QueryClientProvider`.
* Enable **persistQueryClient** using `localStoragePersister` to allow offline revisit (except WebSocket streams).
* WebSocket data fed into cache via `queryClient.setQueryData` for real-time updates.

## 6. TanStack Router Strategy
* Central route definition file declares nested route objects.
* Loader functions leverage TanStack Query to prefetch data on navigation.
* Search params drive UI state (filters, chart interval) resulting in bookmarkable URLs.

## 7. Styling & Theming
* Tailwind config defines custom color palette (finance greens/blues) and typography scale.
* Dark mode enabled via `class` on `<html>`; toggle stored in `localStorage`.
* Reusable components (`Button`, `Card`, `Table`) created as headless components styled with utility classes.

## 8. Security Considerations
* Credentials stored in `localStorage` only in dev/demo; production should swap to HTTP-only cookies or token-based auth.
* Enforce HTTPS/WSS; fallback to insecure origins disabled.
* Validate all form inputs client-side with Zod; server performs authoritative validation.

## 9. Assumptions & Open Questions
| # | Assumption | Rationale / Impact |
|---|------------|--------------------|
| F1 | Single-page app inside Vite | fast HMR & build time.
| F2 | Users comfortable with Basic Auth pop-ups   | can transition to token later.
| F3 | No need for legacy browser support | Tailwind & modern JS features OK.
| F4 | Chart data volume small (<1 k points) | suits client-side rendering.
| F5 | TanStack Router meets navigation needs | no React Router.

## 10. Milestones / Tasks
1. Scaffold Vite + React + TS + Tailwind (`npm create vite@latest`).
2. Install TanStack Query, TanStack Router, Recharts, react-hook-form, Zod.
3. Set up Tailwind config and global styles (dark/light).
4. Implement Auth context, login page, and secure Axios instance.
5. Define route tree and placeholder pages.
6. Implement Profit page with pagination & filters.
7. Implement Charts pages with WebSocket streaming and interval controls.
8. Implement Chat page with WebSocket and optimistic UI.
9. Add testing setup with Vitest & RTL; write component/integration tests.
10. Configure CI (GitHub Actions) & deployment (Netlify/Vercel).

---
*Document version: 0.2 – generated 2025-07-24* 