# PazarGlobal MCP Server

Bu proje, PazarGlobal için basit bir MCP (Model Context Protocol) sunucusu sağlar. Sunucu iki araç (tool) açar:

- `clean_price` — Karmaşık fiyat metinlerini temizleyip sayısal `clean_price` değeri döndürür.
- `insert_listing` — Supabase REST API üzerinden yeni ürün kaydı ekler (gereksinimler .env içinde belirtilmiştir).

## Hızlı başlatma

1. Proje kökünde `.env.example` yoksa `.env` oluşturun ve aşağıdaki değişkenleri doldurun:

SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
HOST=0.0.0.0
PORT=7777

2. Bağımlılıkları yükleyin:

```powershell
npm install
```

3. Sunucuyu başlatın:

```powershell
npm start
```

Sunucu çalışıyorsa şu URL'de MCP uç noktasını görebilirsiniz:

`http://127.0.0.1:7777/mcp`

GET isteği Agent Builder'ın araç keşfi için JSON-RPC formatında bir araç listesi döner. POST ile JSON-RPC `tools/list` ve `tools/call` istekleri desteklenir.

## Güvenlik

- `.env` içinde yer alan anahtarları sürüm kontrolüne eklemeyin. Bu repo `.gitignore` ile `.env`'i dışlar.
- Supabase için `SUPABASE_SERVICE_KEY` güvenli tutulmalıdır.

## İpuçları

- Agent Builder (veya benzeri bir araç) tarayıcıdan ilk olarak GET `/mcp` isteği yapar; bu yüzden GET isteği JSON dönecek şekilde uygulanmıştır.
