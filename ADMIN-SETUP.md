# Portfolio admin setup

The private content manager lives at `/admin.html`. The portfolio remains a static GitHub Pages site; Supabase supplies authentication, metadata and media storage.

## Your chosen workflow

- **Films:** add a YouTube/Vimeo link, upload a video file, or add both to one entry.
- **Photographs:** upload one image or select multiple images at once. Each image becomes its own gallery entry.
- Each entry supports a title, category, description/caption and featured flag.
- The dashboard includes sign-in, content lists and delete controls.

## One-time setup

1. Create a Supabase project.
2. In Authentication, create your own admin user. Keep public sign-ups disabled.
3. Copy the project URL and anon/public key from Project Settings → API.
4. Open `admin.js` and replace `YOUR_SUPABASE_PROJECT_URL` and `YOUR_SUPABASE_ANON_KEY`. The anon key is designed for browser use when Row Level Security is configured. **Never paste a service_role key into this repo.**
5. In Authentication → Users, copy your admin user's UUID.
6. Replace both occurrences of `YOUR_ADMIN_USER_UUID` in `supabase-schema.sql` with that UUID, then run the SQL in Supabase SQL Editor.
7. Deploy the repository using GitHub Pages. Open `/admin.html` on the deployed site and sign in.

## Important

- The SQL policies intentionally allow only the one configured admin UUID to upload, edit or delete. Public visitors can read portfolio entries and view media.
- GitHub Pages is static hosting; it cannot securely store passwords or private server keys.
- The initial admin dashboard stores metadata and media in Supabase. The existing homepage's sample cards are still placeholders; connecting live entries to the public gallery is a separate front-end integration step.
- Large video uploads may hit storage limits or browser/network timeouts. For long films, use the YouTube/Vimeo link field; the file upload option is available for supported file sizes.
