# LifeOS — specificație v1

Aplicație personală (un singur utilizator) pentru managementul vieții. PWA instalabilă pe desktop + telefon.
Stack: Next.js + Supabase (auth, DB, cron, edge functions) + Vercel. Interfață în **română**.

## Design

- **Light**, accent **albastru închis** (navy), plus culori distincte per arie de viață / modul.
- Stil **Apple-like** (clar, aerisit, tipografie bună, colțuri rotunjite, umbre fine) **cu iz jucăuș** din referințe:
  - carduri albe mari, uneori ușor rotite (Lisso), badge-uri colorate (Meeting / High Priority)
  - cifre mari (procent productivitate „85%”), card de statistici colorat
  - streak pe zilele săptămânii cu bife (Bookies), bară „creșterea ta săptămâna asta”
  - tipografie mare pe ecrane de acțiune, picker tactil de zi/oră (HabitPlay)
  - jurnal cu carduri pastel
- Animații: fine și fluide, nu „joculeț”. Feedback plăcut la bifare (+XP discret), moment mai special la level up, fără exces.
- Navigare: **sidebar stânga** pe desktop, **bară jos** pe telefon.
- Fără PIN / mod privat (utilizator unic).

## Gamificare — Life RPG

- Nivel global + **stats pe arii**: Sănătate, Fitness, Minte, Muncă, Personal (fiecare cu culoarea ei).
- Fiecare task / obicei / antrenament / jurnal / ritual dă XP în aria lui.
- Streak-uri, achievements, level up.

## Module v1

### 1. Tasks + Planificare (cascadă)
- Obiective pe **lună** → taskuri pe **săptămână** → taskuri pe **zi**. Progresul urcă în sus.
- Task: titlu, note, **prioritate**, **arie**, **proiect**, **subtaskuri**, **recurență**, dată (+ oră opțional).
- **Proiecte** cu progres.
- **Ritualuri ghidate** (dau XP bonus):
  - Dimineața: „Planifică ziua”
  - Seara: „Review” (ce am făcut, ce mut pe mâine, mood)
  - Duminica: „Planifică săptămâna” (poate înlocui planificarea zilnică)

### 2. Calendar
- Vedere zi / săptămână / lună, time blocking (taskuri cu oră).
- Google Calendar: **mai târziu** (nu în v1).

### 3. Habits + Tratamente
- Obiceiuri create de utilizator (ex: pastile, suplimente, sală, sex, apă...).
- Tipuri: **zilnic / zile anume** (cu una sau mai multe ore), **de X ori pe săptămână**, **cantitative** (2.5L, 10.000 pași).
- Bifa salvează **ora** (editabilă) + notă/valoare opțională → **istoric complet**.
- Streak-uri.

### 4. Gym
- **Template-uri** de antrenament (ex: Push / Pull / Legs).
- Antrenament **live**: vezi ce ai ridicat data trecută, bifezi seturi (kg × repetări), timer de pauză.
- Istoric, grafice de progres, recorduri personale.

### 5. Journal + Mood
- Check-in zilnic: **mood + energie** (+ somn, tag-uri).
- **Jurnal liber**.
- **Jurnal de reframing**: secțiunea **NEGATIV** (frici, descărcare) ↔ **POZITIV** (fiecare lucru reformulat dintr-o perspectivă pozitivă), pereche cu pereche.
- **Statistici mood** în timp + corelații (ex: mood în zilele cu sală).

## Notificări (v1)
- Doar **tratamente / obiceiuri la ora setată** (web push). Supabase `pg_cron` + Edge Function.
- iPhone: necesită iOS 16.4+ și aplicația adăugată pe Home Screen.

## Faze ulterioare (din roadmap)
Inbox, Focus mode, Goals pe termen lung, Google Calendar, Body metrics, Sleep, Nutrition, Medical records,
Finance (tranzacții, bugete, import CSV), Relationships, Notes.
