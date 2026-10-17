# Feed Layout Correction Report

## Kök Neden (Root Cause)

Tweet kartlarının ekranın orta dar kısmında kalmasının üç ana nedeni:

### 1. `Feed.jsx` — `max-w-[1100px]` sınırı
Feed içeriği `max-w-[1100px] mx-auto` ile sarmalanmıştı. Bu, kartları 1100px genişliğinde sınırlayıp ekranın ortasına sıktı. Hedef tasarımda tweet kartları ana içerik alanının neredeyse tamamını kullanıyor.

### 2. `Tweet.jsx` — `max-w-[640px] mx-auto` kaldırıldı ama `max-w-[1100px]` kalmıştı
Tweet kartı kendi içinde `w-full` olmasına rağmen, Feed konteynerinin `max-w-[1100px]` sınırı kartları daraltıyordu.

### 3. Kullanıcı adı/timestamp görünmüyordu
`canLinkToProfile` (authorInfo.id ve username kontrolü) kullanıcı adını ve timestamp'i gizliyordu. Backend'de `author.id` yoksa kullanıcı adı hiç render edilmiyordu.

### 4. Sidebar ikonları küçük
Sidebar ikonları 22px idi, hedefte 24px.

### 5. Tweet metni küçük
`text-base` (16px) yerine `text-xl` (18px+) gerekliydi.

## Yapılan Değişiklikler

### `src/components/layout/AppLayout.jsx`
- `<main>`'den `px-4` (16px sol/sağ padding) kaldırıldı
- Main content artık tarayıcı genişliğinin tamamını kullanıyor

### `src/components/layout/Sidebar.jsx`
| Öğe | Önce | Şimdi |
|-----|------|-------|
| Genişlik | `w-64` (256px) | `w-[280px]` |
| Navigasyon ikonları | `size={20}` | `size={24}` |
| Navigasyon metni | `text-small` | `text-base` |
| `t.` logosu | `text-[2.25rem]` | `text-[2.5rem]` |

### `src/components/tweets/Feed.jsx`
| Öğe | Önce | Şimdi |
|-----|------|-------|
| Konteyner genişliği | `max-w-[1100px]` | `max-w-[1200px]` |
| Padding | yok | `px-4` (sayfa kenarlarından boşluk) |
| Kartlar arası boşluk | `space-y-3` | `space-y-4` (16px) |

### `src/components/tweets/Tweet.jsx`
| Öğe | Önce | Şimdi |
|-----|------|-------|
| Kart genişliği | `w-full` (ama 640px sınırlıydı) | `w-full` (tam genişlik) |
| Kart padding | `p-5` | `p-5` (20px) |
| Kart border radius | `rounded-xl` (14px) | `rounded-xl` (14px) |
| Avatar boyutu | `size={44}` | `size={48}` (48px) |
| Tweet metni | `text-base` | `text-xl` (18px) |
| Satır aralığı | `leading-relaxed` | `leading-loose` |
| Kart arka planı | `bg-[#F1F0EC]` | `bg-[#F1F0EC]` |
| Border | `border-[#E7E5E4]` | `border-[#E7E5E4]` |

### Kullanıcı adı ve timestamp düzeltmesi
Önceki kodda `canLinkToProfile` (authorInfo.id ve username kontrolü) kullanıcı adını ve timestamp'i gizliyordu. Backend'de `author.id` yoksa isimler hiç render edilmiyordu.

**Düzeltme:** `renderName()` fonksiyonu eklendi. Display name ve @username **her zaman** gösteriliyor. Yalnızca `<AppLink>` wrapping'i `authorInfo.id` mevcutsa uygulanır. ID yoksa düz metin olarak görünür.

### Route Tree (Authenticated → /)

```
BrowserRouter
└── App
    ├── isAuthenticated = true
    └── <AppLayout>
        ├── <Sidebar />      (280px genişlik)
        ├── <Header />
        └── <main>           ← flex-1, px-4 kaldırıldı, tam genişlik
            └── {children} → <PrivateRoutes />
                └── <Routes>
                    └── <Route path="/" element={<Home />} />
                        └── <Home />
                            └── <Feed />
                                └── <div className="max-w-[1200px] mx-auto px-4">
                                    └── <ul className="space-y-4">
                                        <li key={tweetId}>
                                            <Tweet tweet={tweet} />
                                                ├── Avatar (48px, daire)
                                                └── flex-1 (kalan genişlik)
                                                    ├── Header (name bold, @username muted, timestamp muted, ···)
                                                    ├── Content (text-xl, leading-loose, @mention cobalt linkler)
                                                    └── Actions (5 buton, small, muted)
```

## Backend Contract Uyumu

| Özellik | Durum |
|---------|-------|
| `GET /feed` | Değiştirilmedi |
| `GET /tweet/{id}` | Değiştirilmedi |
| `statistics.tweetId` | İç işlem (key/routing), UI'da gösterilmiyor |
| `statistics.likes` | Like butonunda gösteriliyor |
| `GET /users/{id}` | `author.id` mevcutsa profil linki |
| `GET /users/me` | Yok (backend limitasyonu) |

### Profile Navigation
Avatar ve username **şartlı olarak** linklenir. `TweetResponse` içinde `author.id` yoksa düz metin olarak görünür. Backend kısıtlamasıdır, frontend'de ID tahmini yapılmaz.

### Mention Links
`@username` cobalt blue ile linklenir. Backend'de mention için kullanıcı ID'si yoksa username üzerinden link verilir.

## Tasarım Kararları

- **Kartlar**: `w-full`, feed konteynerinin tamamını kullanıyor
- **Max-width**: `max-w-[1200px] mx-auto px-4` — ekranın tamamını kullanmaz, dengeli genişlikte kalır
- **Arka plan**: `#F1F0EC` (sayfa `#FAF9F6`'den farklı)
- **Border**: `1px solid #E7E5E4` (ince hairline)
- **Radius**: `rounded-xl` (14px)
- **Padding**: `p-5` (20px)
- **Kart arası**: `space-y-4` (16px)
- **Avatar**: `h-12 w-12` (48px daire)
- **Typography**: Display name bold serif, @username muted, timestamp muted, content `text-xl` leading-loose
- **Like hover**: `#dc2626` kırmızı
- **Diğer hover**: `#1D4ED8` cobalt

## Build Sonuç

`npm run build` — ✅ **2030 modül, hata yok**

## Raporu Kaydet

`feed-layout-correction.md` (proje kökünde)