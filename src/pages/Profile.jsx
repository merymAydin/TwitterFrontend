import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ImagePlus, X } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { useUsers } from "../hooks/useUsers";
import { useTweets } from "../hooks/useTweets";
import { useFollow } from "../hooks/useFollow";
import { fetchCurrentUser } from "../store/slices/authSlice";
import { clearUsersError } from "../store/slices/usersSlice";
import { PageHeader } from "../components/common/PageHeader";
import { EmptyState } from "../components/common/EmptyState";
import { ErrorMessage } from "../components/common/ErrorMessage";
import { Skeleton } from "../components/ui/Skeleton";
import { Avatar } from "../components/ui/Avatar";
import { AppLink } from "../components/ui/Link";
import { Input, Textarea } from "../components/ui";
import { Tweet } from "../components/tweets/Tweet";
import { FollowButton } from "../components/users/FollowButton";
import { UserListDialog } from "../components/users/UserListDialog";
import { VerifiedBadge, isUserVerified } from "../components/users/VerifiedBadge";
import { ROUTES } from "../router";

// The picker accepts JPG, PNG and WebP; the same rule is re-checked client-side.
const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

// What the backend would need in order to store an uploaded file. The API today
// only accepts an image URL (PUT /users/{id} -> "photo"), so a selected file
// cannot be persisted and the UI says so instead of faking it.
const PHOTO_BACKEND_STEPS = [
  "Add a multipart endpoint (e.g. POST /users/{id}/photo taking a MultipartFile, or POST /files returning a URL).",
  "Store the bytes durably — a disk directory, S3/MinIO, or a binary column — with server-side type and size validation.",
  "Serve the stored file back over HTTP (a static ResourceHandler for the upload directory, or a CDN URL).",
  "Write the returned URL into User.photo so GET /users already hands it to profiles, tweets and comments.",
];

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString(undefined, { dateStyle: "long" });
}

/**
 * Reusable profile page. Addressed by numeric user id (GET /users/{id}) so the
 * exact same layout serves the signed-in user and every other user — only the
 * header action changes (Edit profile vs Follow/Unfollow).
 */
export function Profile() {
  const { id } = useParams();
  const profileId = Number(id);
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);

  const {
    profile,
    profileLoading,
    saving,
    error: usersError,
    loadProfile,
    saveProfile,
  } = useUsers();
  const { userTweets, userTweetsLoading, error: tweetsError, loadUserTweets } = useTweets();
  const {
    loadFollowers,
    followersOf,
    followingOf,
    followersCount,
    followingCount,
    loading: followersLoading,
    error: followersError,
  } = useFollow();

  const isOwn = currentUser?.userId != null && Number(currentUser.userId) === profileId;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState(null);
  const [listView, setListView] = useState(null);
  // Profile-photo file picker: the file is only ever previewed locally.
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoError, setPhotoError] = useState(null);
  const [photoNotice, setPhotoNotice] = useState(null);
  const photoInputRef = useRef(null);

  // The preview is a local object URL — release it when it changes or unmounts.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  useEffect(() => {
    if (!id) return;
    loadProfile(profileId);
    loadUserTweets(profileId);
    // The follow relationships are re-read from the backend on every visit, so
    // the Follow/Unfollow state and the counts always match the server.
    loadFollowers();
  }, [id, profileId, loadProfile, loadUserTweets, loadFollowers]);

  // Reset per-profile UI state and any stale error when navigating between profiles.
  useEffect(() => {
    setEditing(false);
    setForm(null);
    setFormError(null);
    setListView(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoError(null);
    setPhotoNotice(null);
    dispatch(clearUsersError());
  }, [profileId, dispatch]);

  const metaItems = useMemo(() => {
    if (!profile) return [];
    const location = profile.location;
    const hasLocation = location && (location.lan || location.lon);
    return [
      // The email is only surfaced on your own profile.
      isOwn && profile.email && { label: "Email", value: profile.email },
      profile.birthday && { label: "Born", value: formatDate(profile.birthday) },
      hasLocation && { label: "Location", value: `${location.lan}, ${location.lon}` },
    ].filter(Boolean);
  }, [profile, isOwn]);

  const startEditing = () => {
    setForm({
      username: profile?.username ?? "",
      bio: profile?.bio ?? "",
      birthday: profile?.birthday ? new Date(profile.birthday).toISOString().slice(0, 10) : "",
      photo: profile?.photo ?? "",
      banner: profile?.banner ?? "",
    });
    setFormError(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoError(null);
    setPhotoNotice(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    setEditing(true);
  };

  // File picker: validate the type, then show a local preview. Nothing is
  // uploaded — the API has no file-storage endpoint (see PHOTO_BACKEND_STEPS).
  const handlePhotoSelect = (event) => {
    const file = event.target.files?.[0];
    // Allows re-selecting the same file after "Remove".
    event.target.value = "";
    if (!file) return;

    const name = file.name.toLowerCase();
    const typeAllowed =
      PHOTO_TYPES.includes(file.type) || PHOTO_EXTENSIONS.some((ext) => name.endsWith(ext));

    if (!typeAllowed) {
      setPhotoFile(null);
      setPhotoPreview(null);
      setPhotoError("Unsupported file. Choose a JPG, PNG or WebP image.");
      return;
    }

    setPhotoError(null);
    setPhotoNotice(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearSelectedPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoError(null);
    setPhotoNotice(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const username = form.username.trim();
    if (!username) {
      setFormError("Username is required.");
      return;
    }
    setFormError(null);

    // A picked file can only be previewed: the API stores the photo as a URL.
    const pendingFile = photoFile;

    // The backend replaces EVERY field on PUT (UserServiceImpl.update), so the
    // fields this form does not edit are echoed back unchanged. Omitting them
    // would null them out (which would break login by clearing the email).
    const payload = {
      username,
      email: profile.email ?? null,
      birthday: form.birthday ? form.birthday : profile.birthday ?? null,
      location: profile.location ?? null,
      bio: form.bio.trim() || null,
      photo: form.photo.trim() || null,
      banner: form.banner.trim() || null,
    };

    try {
      await saveProfile(profileId, payload).unwrap();
      setEditing(false);
      if (pendingFile) {
        // Never report success for something that was not stored.
        setPhotoNotice(
          `Profile saved. The selected photo file “${pendingFile.name}” was NOT uploaded: the backend only stores an image URL.`
        );
      }
      // The sidebar and feed cache the signed-in user; refresh after an edit.
      if (isOwn) dispatch(fetchCurrentUser());
    } catch (err) {
      setFormError(
        typeof err === "string" ? err : err?.message || "Failed to save profile. Please try again."
      );
    }
  };

  if (profileLoading && !profile) return <Skeleton className="h-72 w-full" />;
  if (!profile) {
    return usersError ? (
      <ErrorMessage message={usersError} />
    ) : (
      <EmptyState title="Profile not found" description="This user doesn't exist." />
    );
  }

  const isVerified = isUserVerified(profile);
  const followers = followersOf(profileId);
  const following = followingOf(profileId);
  // While the very first GET /followers is still in flight, show placeholders
  // instead of a misleading "0".
  const countsLoading = followersLoading && followers.length === 0 && followersCount(profileId) === 0;

  return (
    <div className="mx-auto w-full max-w-2xl pb-16">
      <PageHeader title="Profile" description={isOwn ? "Your profile" : undefined} />

      {/* Identity card */}
      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex items-start gap-5">
          <Avatar src={profile.photo} username={profile.username} size={96} className="shrink-0" />

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="flex items-center gap-1.5 font-serif text-heading text-foreground">
                  <span className="truncate">{profile.username}</span>
                  {isVerified && <VerifiedBadge size={18} />}
                </h2>
                <p className="mt-1 text-small text-foreground-muted">@{profile.username}</p>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-2">
                {isOwn ? (
                  !editing && (
                    <button
                      type="button"
                      onClick={startEditing}
                      className="shrink-0 rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-cobalt hover:text-cobalt"
                    >
                      Edit profile
                    </button>
                  )
                ) : (
                  <FollowButton userId={profileId} />
                )}

                {isOwn && !isVerified && !editing && (
                  <AppLink
                    to={ROUTES.VERIFIED}
                    className="text-[0.8rem] font-medium text-cobalt transition-colors hover:text-cobalt-hover"
                  >
                    Get verified
                  </AppLink>
                )}
              </div>
            </div>

            {profile.bio && (
              <p className="mt-3 whitespace-pre-wrap break-words text-body leading-relaxed text-foreground">
                {profile.bio}
              </p>
            )}

            <div className="mt-4 flex items-center gap-6">
              <button
                type="button"
                onClick={() => setListView("following")}
                className="flex items-baseline gap-1.5 rounded-md transition-colors hover:text-cobalt"
              >
                <span className="text-small font-semibold text-foreground">
                  {countsLoading ? "—" : followingCount(profileId)}
                </span>
                <span className="text-small text-foreground-muted">Following</span>
              </button>
              <button
                type="button"
                onClick={() => setListView("followers")}
                className="flex items-baseline gap-1.5 rounded-md transition-colors hover:text-cobalt"
              >
                <span className="text-small font-semibold text-foreground">
                  {countsLoading ? "—" : followersCount(profileId)}
                </span>
                <span className="text-small text-foreground-muted">Followers</span>
              </button>
            </div>

            {followersError && followers.length === 0 && (
              <p className="mt-2 text-[0.8rem] text-[#DC2626]">{followersError}</p>
            )}

            {metaItems.length > 0 && (
              <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1">
                {metaItems.map((item) => (
                  <div key={item.label} className="flex items-baseline gap-1.5">
                    <dt className="text-small text-foreground-muted">{item.label}</dt>
                    <dd className="text-small text-foreground">{item.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        {isOwn && !profile.bio && !editing && (
          <p className="mt-4 text-small text-foreground-muted">
            No bio yet. Use “Edit profile” to add one.
          </p>
        )}
      </div>

      {/* Honest outcome notice: never claim an uploaded file was stored. */}
      {photoNotice && (
        <div
          role="status"
          className="mt-4 flex items-start justify-between gap-3 rounded-md border border-border bg-surface p-3"
        >
          <p className="text-[0.8rem] leading-relaxed text-foreground">{photoNotice}</p>
          <button
            type="button"
            onClick={() => setPhotoNotice(null)}
            aria-label="Dismiss"
            className="shrink-0 rounded-md p-1 text-foreground-muted transition-colors hover:bg-white hover:text-foreground"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Followers / following list */}
      {listView && (
        <UserListDialog
          title={listView === "followers" ? "Followers" : "Following"}
          userIds={listView === "followers" ? followers : following}
          onClose={() => setListView(null)}
        />
      )}

      {/* Edit form */}
      {isOwn && editing && (
        <form
          onSubmit={handleSave}
          className="mt-4 rounded-2xl border border-border bg-white p-6"
        >
          <h3 className="mb-4 text-base font-medium text-foreground">Edit profile</h3>

          <div className="space-y-4">
            <Input
              id="profile-username"
              label="Username"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              required
            />
            <Textarea
              id="profile-bio"
              label="Bio"
              rows={3}
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Tell people about yourself"
            />
            <Input
              id="profile-birthday"
              label="Birthday"
              type="date"
              value={form.birthday}
              onChange={(e) => setForm((f) => ({ ...f, birthday: e.target.value }))}
            />
            {/* Profile photo — file picker (local preview only) + the storable URL */}
            <div className="space-y-3">
              <span className="block text-label font-sans">Profile photo</span>

              <div className="flex items-start gap-4">
                <Avatar
                  src={photoPreview || form.photo.trim() || profile.photo}
                  username={form.username || profile.username}
                  size={96}
                  className="shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-cobalt hover:text-cobalt"
                    >
                      <ImagePlus size={16} strokeWidth={1.8} />
                      Choose a photo
                    </button>
                    {photoFile && (
                      <button
                        type="button"
                        onClick={clearSelectedPhoto}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
                      >
                        <X size={15} strokeWidth={2} />
                        Remove
                      </button>
                    )}
                  </div>

                  <input
                    ref={photoInputRef}
                    id="profile-photo-file"
                    type="file"
                    accept={PHOTO_ACCEPT}
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />

                  {photoFile ? (
                    <p className="text-[0.8rem] text-foreground-muted">
                      <span className="font-medium text-foreground">{photoFile.name}</span> ·{" "}
                      {Math.max(1, Math.round(photoFile.size / 1024))} KB ·{" "}
                      <span className="text-cobalt">preview only, not saved</span>
                    </p>
                  ) : (
                    <p className="text-[0.8rem] text-foreground-muted">
                      JPG, PNG or WebP.
                    </p>
                  )}

                  {photoError && (
                    <p role="alert" className="text-[0.8rem] text-[#DC2626]">
                      {photoError}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-md border border-border bg-surface p-3">
                <p className="text-[0.8rem] leading-relaxed text-foreground-muted">
                  <span className="font-medium text-foreground">
                    File upload is not supported by the API yet.
                  </span>{" "}
                  The backend stores the photo as an image URL (
                  <code className="rounded bg-white px-1">{"PUT /users/{id}"}</code> →{" "}
                  <code className="rounded bg-white px-1">photo</code>), so a selected file can only
                  be previewed here. Saving stores your other changes; the file itself is not
                  uploaded.
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-[0.8rem] font-medium text-cobalt">
                    What the backend needs
                  </summary>
                  <ol className="mt-2 space-y-1.5" role="list">
                    {PHOTO_BACKEND_STEPS.map((step, index) => (
                      <li
                        key={step}
                        className="flex gap-2 text-[0.8rem] leading-relaxed text-foreground"
                      >
                        <span className="font-semibold text-foreground-muted">{index + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </details>
              </div>

              <Input
                id="profile-photo"
                label="Image URL"
                value={form.photo}
                onChange={(e) => setForm((f) => ({ ...f, photo: e.target.value }))}
                placeholder="https://example.com/photo.png"
              />
            </div>
            <Input
              id="profile-banner"
              label="Banner URL"
              value={form.banner}
              onChange={(e) => setForm((f) => ({ ...f, banner: e.target.value }))}
              placeholder="https://example.com/banner.png"
            />
          </div>

          {photoFile ? (
            <p className="mt-4 text-small text-foreground-muted">
              Saving stores your other changes.{" "}
              <span className="font-medium text-foreground">{photoFile.name}</span> will not be
              uploaded.
            </p>
          ) : (
            <p className="mt-4 text-small text-foreground-muted">
              The backend stores the photo and banner as image URLs, so the Image URL field is the
              value that gets saved.
            </p>
          )}

          {formError && (
            <div className="mt-4 rounded-md border border-[#FCA5A5] bg-[#FEF2F2] p-2 text-sm text-[#DC2626]">
              {formError}
            </div>
          )}

          <div className="mt-5 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-cobalt px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-cobalt-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setFormError(null);
              }}
              className="rounded-full px-4 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-surface hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Posts */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-medium text-foreground">Posts</h2>
          <span className="text-small text-foreground-muted">{userTweets.length}</span>
        </div>

        {userTweetsLoading && userTweets.length === 0 ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : tweetsError && userTweets.length === 0 ? (
          <ErrorMessage message={tweetsError} />
        ) : userTweets.length === 0 ? (
          <EmptyState
            title="No posts yet"
            description={
              isOwn ? "Your posts will appear here." : `Posts by @${profile.username} will appear here.`
            }
          />
        ) : (
          <ul className="space-y-4" role="list">
            {userTweets.map((tweet) => (
              <li key={tweet.id ?? tweet.statistics?.tweetId}>
                <Tweet tweet={tweet} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

