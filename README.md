# Mahmoud Elfaham Portfolio CMS

The existing `index.html`, `css/style.css`, and `js/script.js` remain the public design and local static preview. On the server, Apache/LiteSpeed serves `index.php`, which returns the same HTML and adds `js/cms.js`; that script hydrates the existing sections from published records returned by the PHP API. The configured site fails closed if database content cannot load, so stale static records do not become public. A direct web request for `/index.html` redirects to the PHP entry point; opening the file locally still gives the static preview.

## Installation

1. Create a MySQL database and database user in Hostinger hPanel. Grant that user full privileges for the portfolio database.
2. Import `database/database.sql` using phpMyAdmin. It creates the tables and seeds the existing portfolio content as published records.
3. Copy `config/local.example.php` to `config/local.php`. Set the database name, user, and password. Set `app_key` to a unique random value of at least 32 characters. With SSH, generate one using `openssl rand -hex 32`.
4. Upload the project files to the website’s document root. Keep the supplied `.htaccess` files, especially `uploads/.htaccess`.
5. In hPanel, choose PHP 8.2 or newer and enable PDO MySQL, Fileinfo, and (for image resizing/thumbnails) GD.
   For multi-image uploads, set PHP `upload_max_filesize` to at least `8M`, `post_max_size` to about `100M`, and `max_file_uploads` to at least `12` where hPanel permits.
6. Visit `/install.php` over HTTPS and create your own administrator username and password. Passwords must be at least 12 characters. There are no shipped login credentials.
7. Sign in at `/admin/`. Upload images in Media Library, add useful alt text, then assign an uploaded image in the relevant content record. Publish records to show them publicly; drafts remain private.
8. Once account creation succeeds, remove `install.php` from the document root. It is one-time guarded already, but removing it reduces exposed setup surface.

## Hostinger notes

- Use the database host shown in hPanel (often `localhost`) in `config/local.php`.
- Serve the site over HTTPS so the admin session cookie is marked Secure.
- The web server needs write permission to `uploads/` (normally 755 is sufficient). Do not make `config/` or `database/` publicly readable; their `.htaccess` files deny direct requests on Apache/LiteSpeed.
- This uses PHP sessions, PDO prepared statements, MySQL/MariaDB, and browser Fetch. It has no framework, Composer package, or Node build step.
- `index.html` can still be opened directly for the static design preview. To see database content locally, use a PHP 8.2+ web server with MySQL and configure `config/local.php`.

## CMS coverage

The dashboard at `/admin/` supports profile/about and settings updates; CRUD for projects, experience and training, skills, achievements, certifications, education, leadership, events, gallery items, services, and social links; and media upload, alt text/category editing, and deletion when the image is not assigned. Project covers and additional project photos, profile portrait, certificates, event images, and gallery images use the central media library.

Public API: `api/public.php`. Admin APIs are protected by a PHP session and CSRF token. Uploaded images are limited to JPEG, PNG, and WebP, named randomly, size/dimension checked, and never accepted as executable formats. When GD is present, large images are resized and metadata-stripped and a smaller thumbnail is generated.

## Database changes

`database/database.sql` is for a fresh install. Back up the database before applying schema changes to an existing production installation.
