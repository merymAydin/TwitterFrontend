import { Feed } from "../components/tweets";
import { TweetComposer } from "../components/tweets/TweetComposer";
import { PageHeader } from "../components/common/PageHeader";

export function Home() {
  return (
    <div>
      <PageHeader title="Home" description="Your timeline" />
      <div className="mb-6">
        <TweetComposer />
      </div>
      <Feed />
    </div>
  );
}

