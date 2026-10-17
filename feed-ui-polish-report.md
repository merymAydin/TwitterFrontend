# Feed UI Polish Report

## Özet

Twitter feed'i modern sosyal medya timeline tasarımına dönüştürüldü. Eski forum/blog görünümü kaldırıldı. Her tweet ayrı bir kart (card) içinde gösteriliyor.

## Değiştirilen Dosyalar

| Dosya | İşlem |
|-------|-------|
| `src/components/tweets/Tweet.jsx` | Tamamen yeniden yazıldı — tweet kartı tasarımı |
| `src/components/ui/Avatar.jsx` | 44px boyut, kırık image fallback, modern avatar |
| `src/assets/avatar-default.svg` | **Yeni** — estetik SVG default avatar |
| `src/components/layout/AppLayout.jsx` | Main content padding `px-4 pt-6` olarak ayarlandı |
| `src/components/tweets/Feed.jsx` | Kartlar arası `space-y-3` boşluk |
| `feed-ui-polish-report.md` | **Yeni** — bu rapor dosyası |

## Tweet Kartı Tasarımı

### Layout
- Her tweet ayrı bir `<article>` kartı içinde
- Kart arka planı: `#F1F0EC` (sayfa `#FAF9F6`'den hafifçe farklı)
- Border: `1px solid #E7E5E4` (hairline)
- Border radius: `rounded-2xl` (16px)
- Padding: `p-4` (16px)
- Kartlar arası boşluk: `mb-4` (16px) + `space-y-3` (Feed'te)
- Max-width: `max-w-[640px] mx-auto` (ekranın tamamını kaplamıyor, ortalanmış)
- Hover: `hover:bg-[#E7E5E4]` geçiş efekti

### Tweet Header (Başlık Satırı)
- Avatar solda (44px, daire, clickable)
- Display name (bold, serif, near-black)
- @username (muted gray, küçük)
- Timestamp (sağ üst, muted gray, küçük)
- Three dots menü (sağ üst, MoreHorizontal ikonu)
- Avatar ve username tıklanabilir (profil sayfasına gider, `author.id` mevcutsa)

### Tweet Content
- İçerik header'ın altında
- Font: `text-base` (16px), `leading-relaxed` (okunabilir satır aralığı)
- @mention ifadeleri: cobalt blue (`#1D4ED8`), tıklanabilir, profil sayfasına yönlendirir
- Backend'de mention için kullanıcı ID'si yoksa: username ile linklenir, ID tahmini yapılmaz

### Tweet Actions (Alt Bölüm)
- Reply (MessageCircle ikonu)
- Retweet (RefreshCcw ikonu)
- Like (Heart ikonu, sayı ile, hover'da kırmızı `#dc2626`)
- Bookmark (Bookmark ikonu)
- Share (Share2 ikonu)
- Hepsi: küçük, zarif, `text-[0.8rem] font-medium`, hover'da hafif renk değişimi

### Avatar Tasarımı
- Profil fotoğrafı varsa gösterilir
- Fotoğraf yoksa yerel `avatar-default.svg` kullanılır (estetik, minimal, silüet yok, soru işareti yok)
- Boyut: 44-48px (`h-11 w-11`)
- Dairesel: `rounded-full`
- Kırık image: `onError` ile default SVG'ye düşer
- Sayfa arka planından farklı olan `bg-surface` konteyner içinde

## Backend Contract Uyumu

| Özellik | Durum |
|---------|-------|
| `GET /feed` | Değiştirilmedi, çalışır |
| `GET /tweet/{id}` | Değiştirilmedi |
| `statistics.tweetId` | İç işlem (key/routing) için kullanılıyor, UI'da gösterilmiyor |
| `statistics.likes` | Like butonunda gösteriliyor |
| `GET /users/{id}` | `author.id` mevcutsa profile link veriliyor |
| Mention için kullanıcı ID'si | Yok → username ile linklenir, ID tahmini yapılmadı |

### Kullanılmayan Özellikler (Backend Yok)
- `retweetCount`, `bookmarkCount`, `viewCount` → Gösterilmiyor
- Comment count per tweet → Endpoint yok
- `author.id` / `user.id` → TweetResponse'da garantili değil

## Tasarım Kararları

1. **Kart (Card) yapısı**: Her tweet ayrı bir `<article>` içinde, sayfadan hafifçe farklı arka plan rengi (`#F1F0EC` vs `#FAF9F6`)
2. **Max-width**: `max-w-[640px] mx-auto` — kartlar ekranın tamamını覆lamaz, ortalanmış görünür
3. **Boşluk**: Kartlar arası `mb-4` + `space-y-3`, içerik içinde `mb-3` (content'e), `mb-1` (header'a)
4. **Hover etkisi**: `hover:bg-[#E7E5E4]` — hafif geçiş
5. **Like rengi**: Hover'da kırmızı (`#dc2626`) — sosyal medya standardı
6. **Teknik ID**: `Tweet ID: X` gibi gösterimler UI'dan tamamen kaldırıldı

## Build Sonucu

`npm run build` — ✅ **2030 modül, hata yok**

## Kullanım

Dev sunucuyu başlatın:
```powershell
npm run dev
```

Giriş yaptıktan sonra `http://localhost:5173` adresinde modern tweet kartları görülebilir.