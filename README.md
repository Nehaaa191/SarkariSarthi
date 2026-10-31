# SarkariSaathi 🪄

**AI-powered citizen assistant for Indian government schemes**

> Government Schemes, Made Simple for Everyone.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 **Saathi AI Chat** | Gemini 2.0 Flash powered Q&A grounded in official scheme data |
| 🎤 **Voice Input** | Web Speech API with Hindi (hi-IN) + English support |
| 🔊 **Voice Output** | Text-to-speech for all AI responses |
| ✅ **Eligibility Checker** | Rule-based evaluation of 5+ schemes with match scores |
| 🛡 **Claim Verifier** | Fact-check WhatsApp forwards against official scheme data |
| 📚 **Schemes Browser** | 8 curated schemes with search, filter, and save |
| 📋 **Application Guide** | Step-by-step checklists with document requirements |
| 🌐 **Bilingual** | Full English + हिंदी i18n support |
| 📱 **Responsive** | Mobile-first, adapts to all screen sizes |

## 🚀 Quick Start

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## 🔑 Setting Up Gemini AI

1. Get a free API key at [aistudio.google.com](https://aistudio.google.com)
2. Open the app → Chat → click **API Key**
3. Paste your key — it's stored only in your browser's localStorage

## 🗂 Project Structure

```
frontend/
├── src/
│   ├── i18n/           # Bilingual strings (EN + HI) + context
│   ├── components/     # Shared UI components
│   │   ├── Navbar.tsx  # Sticky glassmorphic navbar
│   │   ├── Hero.tsx    # Split hero with chat preview
│   │   ├── AskSaathi.tsx  # Search bar with voice
│   │   ├── Features.tsx   # 5 feature cards with mini UIs
│   │   ├── HowItWorks.tsx # 4-step process
│   │   ├── DashboardPreview.tsx  # Full policy reader mockup
│   │   ├── TrustSection.tsx  # 4 trust cards
│   │   ├── CTASection.tsx    # Dark CTA with animated orb
│   │   └── Footer.tsx        # 4-column dark footer
│   ├── pages/
│   │   ├── Home.tsx      # Landing page composer
│   │   ├── Chat.tsx      # Full AI chat with sidebar (🔑 Gemini)
│   │   ├── Schemes.tsx   # Searchable scheme browser
│   │   ├── Eligibility.tsx  # Rule-based eligibility checker
│   │   ├── Verify.tsx    # AI claim fact-checker
│   │   ├── Dashboard.tsx # User workspace overview
│   │   └── Apply.tsx     # Step-by-step application guide
│   ├── App.tsx           # Router + conditional navbar/footer
│   ├── main.tsx          # React entry point
│   └── index.css         # Design tokens + global styles
└── index.html            # SEO meta + Google Fonts
```

## 🏛 Schemes Covered

1. Central Sector Scholarship (CSSS) — `scholarships.gov.in`
2. PM-KISAN — `pmkisan.gov.in`
3. Ayushman Bharat PM-JAY — `pmjay.gov.in`
4. PM Awas Yojana (Urban) — `pmaymis.gov.in`
5. PM Mudra Yojana — `mudra.org.in`
6. PM Matru Vandana Yojana — `wcd.nic.in`
7. Sukanya Samriddhi Yojana — `indiapost.gov.in`
8. NSP SC/ST/OBC/Minority Scholarships — `scholarships.gov.in`

## 🎨 Design System

- **Colors:** Navy `#1B2060`, Gold `#F5C518`, Cream `#FEF9EC`
- **Fonts:** Sora (headings) + DM Sans (body)
- **Style:** Glassmorphic navbar, cream hero split, dark navy sections, gold accents

## ⚠️ Disclaimer

Sarkari Saathi is an independent platform. Always verify information on official government portals before taking action.