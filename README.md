# Fantasy Hockey

Local-first NHL tools for managing a fantasy hockey team. The first feature is a **Monday–Sunday weekly schedule grid** for all 32 teams.

## Weekly schedule

Mirrors the useful parts of [Daily Faceoff’s weekly schedule](https://www.dailyfaceoff.com/nhl-weekly-schedule):

- Every NHL team in a row
- Each day of the fantasy week (Mon–Sun) with opponent and home/away (`@` = road)
- Weekly game count
- Default sort: team name A–Z
- Filter by games this week, or click **Games** to rank by volume
- Week picker covering the full NHL season (preseason through the playoff window)

Data is loaded from the NHL’s public API (`api-web.nhle.com`), not scraped. That is more stable for hosting later (Vercel, etc.) and stays current when the league postpones games.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
