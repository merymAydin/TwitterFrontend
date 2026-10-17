# Frontend Runtime Debug Report — GET /feed not firing

## Kök Neden (Root Cause)

**`AppLayout.jsx` render etmiyor `{children}` prop'unu.**

`App.jsx` içinde `AppLayout` şu şekilde kullanılıyor:

```jsx
<AppLayout>
  <PrivateRoutes />
</AppLayout>
```

`PrivateRoutes` (içinde `Home` → `Feed` bulunuyor) `AppLayout`'a `children` olarak iletiliyor. Ancak `AppLayout.jsx` `children`'i render etmiyor, sadece `<Outlet />` render ediyor:

```jsx
// AppLayout.jsx (eski, hatalı)
<main className="flex-1 overflow-y-auto bg-background p-8">
  <Outlet />
</main>
```

`<Outlet />` yalnızca `AppLayout` bir `Route` elementi olarak `<Routes>` ağacı içinde render edildiğinde çalışır. Ancak `AppLayout` doğrudan JSX ternary içinde render ediliyor, `Route` elementi değil:

```jsx
<AppLayout>
  <PrivateRoutes />
</AppLayout>
```

Sonuç: `<Outlet />` route context'e sahip değil, `null` render eder. `PrivateRoutes` (ve içerisindeki `Home` → `Feed`) hiç mount olunmuyor. Bu yüzden `GET /feed` isteği asla gönderilmiyor.

**Karşılaştırma:** `AuthLayout.jsx` doğru şekilde `{children}` render ediyordu (dosya 1-9 satırları), bu yüzden `/login` ve `/register` public route'ları normal çalışıyordu. Yalnızca `AppLayout` bu hataya sahipti.

## Route Tree (Authenticated Kullanıcı → /)

```
BrowserRouter (main.jsx)
└── App (App.jsx)
    ├── isAuthenticated = true
    ├── isPublicPath = false ("/" PUBLIC_PATHS'te değil)
    ├── Redirect yok (her iki koşul da false)
    └── <AppLayout>  ← AppLayout direkt render ediliyor, Route elementi DEĞİL
        ├── <Sidebar />
        ├── <Header />
        └── <main>
            └── <Outlet />  ← Route context yok, null render eder
                └── (PrivateRoutes as_children Hiç render edilmiyor!)
                    └── <Routes>
                        └── <Route path="/" element={<Home />} />
                            └── <Home />
                                ├── <PageHeader />
                                └── <Feed />  ← Mount olmuyor → useEffect çalışmıyor → GET /feed gitmiyor
```

## Düzeltme

**`src/components/layout/AppLayout.jsx`** — `Outlet` import'u ve kullanımı kaldırıldı, `{children}` prop'u render ediliyor:

```jsx
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function AppLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto bg-background p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

Bu sayede `PrivateRoutes` (içinde `<Routes><Route path="/" element={<Home />} /></Routes>`) mount olur, `/` eşleşir, `Home` render olur, `Feed` mount olur, `useEffect` çalışır ve `GET /feed?page=0&size=20` isteği gitmiş olur.

## Değiştirilen Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `src/components/layout/AppLayout.jsx` | `Outlet` import'u kaldırıldı, `{children}` render ediliyor, prop olarak `children` eklendi |
| `src/App.jsx` | Debug console.log'ları kaldırıldı |
| `src/components/tweets/Feed.jsx` | Debug console.log'ları kaldırıldı |
| `src/hooks/useTweets.js` | Debug console.log'ları kaldırıldı, `useCallback` korundu |
| `src/store/slices/tweetsSlice.js` | Debug console.log'ları kaldırıldı |
| `src/api/axios.js` | Debug console.log'ları kaldırıldı |
| `src/pages/Home.jsx` | Debug console.log'ları kaldırıldı |

## API Çağrısı Akışı (Düzeltme Sonrası)

1. Kullanıcı giriş yapar → `isAuthenticated = true`
2. `App.jsx` → `<AppLayout><PrivateRoutes /></AppLayout>` render eder
3. `AppLayout` → `{children}` → `PrivateRoutes` mount olur
4. `PrivateRoutes` → `<Routes><Route path="/" element={<Home />} /></Routes>` → `/` eşleşir → `Home` render olur
5. `Home` → `<Feed />` render eder
6. `Feed` → `useEffect` mount'ta çalışır → `loadTweets({ page: 0, size: 20 })` çağırır
7. `useTweets` → `dispatch(fetchTweets({ page: 0, size: 20 }))`
8. `fetchTweets` thunk → `api.get("/feed", { params: { page: 0, size: 20 } })`
9. Axios → `GET http://localhost:8080/feed?page=0&size=20` (Authorization: Bearer header ile)
10. **Network → Fetch/XHR altında `GET /feed` görünür**

## Build Sonucu

`npm run build` — ✅ Başarılı (2028 modül, hata yok)

## Debug Dosyası

Tüm geçici `console.log` ifadeleri temizlendi. `frontend-runtime-debug.md` bu dosyada kalıyor.