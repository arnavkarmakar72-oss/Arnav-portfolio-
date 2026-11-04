# Portfolio admin setup

The admin dashboard is available at `/admin.html`. GitHub Pages hosts the site, while Supabase handles sign-in, portfolio metadata and uploaded media.

## Already configured

- Supabase project created in the Mumbai region.
- Admin user's UUID added to the database and storage access policies.
- `portfolio_items` table and public media bucket created.
- `admin.js` connected with the project's publishable key.
- Public homepage connected to the portfolio table. New uploads appear in the work grid automatically.

## How to use the dashboard

1. Deploy the latest repository changes with GitHub Pages.
2. Open your website's `/admin.html` page.
3. Sign in using the admin email and password you created in Supabase Authentication.
4. Add films using a YouTube/Vimeo link, a video file, or both. Add a poster if available.
5. Add photographs individually or select multiple images for a bulk upload.

Each item supports a title, category, description/caption and featured flag. Uploaded items are stored in the `portfolio-media` bucket.

## Security notes

- The browser uses a Supabase publishable key, which is intended for public clients and is protected by Row Level Security.
- Never put a Supabase service_role or secret key in this repository.
- Only the configured admin UUID can add, update or delete portfolio entries and media. Public visitors can read portfolio entries and view media.
- Keep public sign-ups disabled in Supabase Authentication.
- Large video uploads may run into storage limits or browser/network timeouts. For long films, YouTube/Vimeo links are the more reliable option.

## Database SQL

The `supabase-schema.sql` file reflects the admin UUID and policies already applied to the connected project. Do not rerun it unless you intentionally need to recreate or update the schema.
