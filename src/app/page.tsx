import { HomeDashboard } from "@/components/home/home-dashboard";
import { getHomePageData } from "@/features/home/queries";
import { getAuthContext } from "@/lib/auth";

export default async function HomePage() {
  const auth = await getAuthContext();
  const data = await getHomePageData(auth.user);

  return <HomeDashboard data={data} />;
}
