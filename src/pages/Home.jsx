import { Feed } from "../components/tweets";
import { PageHeader } from "../components/common/PageHeader";

export function Home() {
  return (
    <div>
      <PageHeader title="Home" description="Your timeline" />
      <Feed />
    </div>
  );
}
