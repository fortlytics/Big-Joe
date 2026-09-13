import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // The Sheet's Images column can point at any host the dealer pastes in
    // (Google Drive, Imgur, Cloudinary, a phone's photo backup service,
    // Wikimedia for brand logos, etc). The catalog is admin-write-only —
    // not public user submissions — so allowing any HTTPS host here is a
    // deliberate, documented choice, not a security gap: nobody but the
    // dealer (via the password-gated /admin panel or direct Sheet edits)
    // can add an image URL in the first place.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default nextConfig;
