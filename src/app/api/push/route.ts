import webpush from "web-push";
import { VAPID_PUBLIC_KEY } from "@/lib/vapid";

type Item = {
  subscription: webpush.PushSubscription;
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

// Apelat din Supabase (pg_cron + pg_net) în fiecare minut în care e ceva de trimis.
export async function POST(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.VAPID_PRIVATE_KEY) {
    return Response.json({ error: "VAPID_PRIVATE_KEY lipsește" }, { status: 500 });
  }

  webpush.setVapidDetails("mailto:lifeos@users.noreply.github.com", VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

  const { notifications = [] } = (await req.json()) as { notifications?: Item[] };
  const results = await Promise.allSettled(
    notifications.map((n) =>
      webpush.sendNotification(n.subscription, JSON.stringify({ title: n.title, body: n.body, url: n.url ?? "/", tag: n.tag }), {
        TTL: 60 * 60,
        urgency: "high",
      }),
    ),
  );

  const gone = results.flatMap((r, i) =>
    r.status === "rejected" && [404, 410].includes((r.reason as { statusCode?: number })?.statusCode ?? 0) ? [notifications[i].subscription.endpoint] : [],
  );
  return Response.json({ sent: results.filter((r) => r.status === "fulfilled").length, gone });
}
