export const LAST_UPDATED = "October 2026";
export const PUBLIC_SOURCE_LINK = "https://github.com/fija-K/little-pages";
export const CONTACT_EMAIL = "privacy@littlepages.app";

export interface SummaryPoint {
  icon: string;
  title: string;
  text: string;
}

export const SUMMARY_POINTS: SummaryPoint[] = [
  {
    icon: "🔐",
    title: "On-Device Encryption",
    text: "Your pages are encrypted on your device with a key made from your passphrase (AES-256-GCM)."
  },
  {
    icon: "🙈",
    title: "Zero Knowledge",
    text: "We can't read your pages. The secret encryption key never leaves your device."
  },
  {
    icon: "🏠",
    title: "No Account Needed",
    text: "Local-only mode stores everything in this browser only. No sign-up required."
  },
  {
    icon: "☁️",
    title: "Optional Cloud Sync",
    text: "Cloud sync is optional — only encrypted ciphertexts are uploaded to the cloud."
  },
  {
    icon: "🚫",
    title: "No Tracking & No Ads",
    text: "No ads, no data selling, and no analytics trackers on your private diary content."
  },
  {
    icon: "⚠️",
    title: "Passphrase Recovery Safety",
    text: "If you forget your passphrase, nobody can recover your data. Keep your recovery key and backups safe."
  },
  {
    icon: "🗑️",
    title: "Complete Control",
    text: "You can purge all your local and cloud data anytime with one click in settings."
  }
];

export const PRIVACY_POLICY_DATA = {
  title: "Privacy Policy",
  lastUpdated: LAST_UPDATED,
  contactEmail: CONTACT_EMAIL,
  
  localOnly: {
    heading: "A) Local-Only Usage (No Account)",
    bullets: [
      {
        label: "Browser Storage Only",
        details: "Your pages, goals, sub-items, stickers, tags, mood choices, and settings are saved strictly inside your local browser storage, encrypted with AES-256-GCM using your passphrase. Nothing is sent to us."
      },
      {
        label: "Backup & Device Loss",
        details: "Clearing your browser data or losing the device deletes them permanently. Export an encrypted backup file regularly."
      }
    ]
  },
  
  signedInSync: {
    heading: "B) Signed-In Usage (Cloud Sync)",
    bullets: [
      {
        label: "What We Receive",
        details: "Your Firebase Account ID (UID) and email address. We never ask for, use, or store your display name or profile photo (any name/photo provided by OAuth sign-in is stripped immediately)."
      },
      {
        label: "What Is Encrypted",
        details: "Titles, text, mood, tags, page color, favorite status, goals, sub-items, deadlines, doodle stickers, streak data, and settings (all AES-256-GCM encrypted client-side before upload)."
      },
      {
        label: "What Is Visible To Us",
        details: "Document creation timestamps (used for Firestore chronological sorting) and payload sizes."
      },
      {
        label: "Storage Location & Isolation",
        details: "Google Firebase Cloud Firestore (us-central1), hosted on Firebase / Vercel infrastructure. Database security rules restrict access so each user can access only their own UID path."
      },
      {
        label: "No Profile Data",
        details: "We never use or store your name or profile photo in our database or application state."
      },
      {
        label: "Retention & Deletion",
        details: "Data is kept until you delete it. The 'Delete all my data' button in settings permanently purges all local storage and erases all your Firestore documents."
      },
      {
        label: "Third Parties & Ads",
        details: "We don't sell data, show ads, or track diary content. Third parties involved are strictly infrastructure providers: Firebase (sign-in and storage) and hosting."
      },
      {
        label: "Minimum Age Requirement",
        details: "Little Pages is intended for users who are at least 13 years of age (13+)."
      },
      {
        label: "Honest Technical Limits",
        details: "The app runs in your browser, so security relies on browser integrity. If your device is compromised or left unlocked while logged in, decrypted pages on screen can be seen. Always tap 'Lock Now' when stepping away."
      }
    ]
  }
};

export const TERMS_DATA = {
  title: "Terms of Use",
  lastUpdated: LAST_UPDATED,
  contactEmail: CONTACT_EMAIL,
  points: [
    "Provided as-is: Little Pages is provided 'as is', with no guarantee or warranty. Keep your own backups.",
    "Acceptable Use: Don't use the application to break the law or disrupt cloud service controls.",
    "Service Modifications: We may change or stop the service, with notice where possible.",
    "Contact: For any terms questions, contact us at privacy@littlepages.app."
  ]
};
