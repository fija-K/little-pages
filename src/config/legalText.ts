export const LAST_UPDATED = "October 2, 2026";

export interface LegalPageContent {
  title: string;
  lastUpdated: string;
  summary: string;
  localMode: {
    heading: string;
    points: string[];
  };
  syncMode: {
    heading: string;
    points: string[];
  };
  contact: string;
}

export const PROTECTION_TEXT: LegalPageContent = {
  title: "How Your Data is Protected",
  lastUpdated: LAST_UPDATED,
  summary: "Little Pages is designed with zero-knowledge architecture. Your diary content, titles, goals, sub-items, tags, mood choices, themes, and stickers are encrypted locally on your device before saving.",
  localMode: {
    heading: "If you use Little Pages without an account (Local Only Mode)",
    points: [
      "100% Local Storage: All your journal entries, goals, and settings are encrypted using AES-256-GCM and stored only inside your browser's local storage.",
      "No Cloud Server Contact: We do not send your diary pages, passphrase, encryption keys, or usage telemetry to any server.",
      "Zero Data Persistence on Device Loss: Clearing your browser history/storage or losing your device permanently deletes local data. You should export an encrypted JSON backup regularly.",
      "Passphrase Responsibility: Your encryption key is derived from your passphrase using PBKDF2 (250,000 iterations). If you lose your passphrase, your data cannot be recovered by anyone."
    ]
  },
  syncMode: {
    heading: "If you sign in and sync (Cloud Sync Mode)",
    points: [
      "End-to-End Encrypted (E2EE) Sync: Only ciphertexts are uploaded to Firebase Cloud Firestore. Your vault passphrase and derived CryptoKey stay strictly in your local browser memory.",
      "Minimal Account Data: We store only your Firebase User ID (UID) and account email. We never collect or store your real name or profile photo.",
      "Strict Database Isolation: Server-side Firebase security rules restrict database reads and writes exclusively to your authenticated UID (`request.auth.uid == userId`).",
      "No Master Recovery Key: Cloud administrators have zero access to your plaintext entries. If you lose your passphrase and emergency recovery key, cloud data cannot be decrypted."
    ]
  },
  contact: "Questions or security concerns? Contact security@littlepages.app"
};

export const PRIVACY_TEXT: LegalPageContent = {
  title: "Privacy Policy",
  lastUpdated: LAST_UPDATED,
  summary: "We respect your absolute right to privacy. Little Pages does not track your reading or writing habits, display advertisements, or sell personal data.",
  localMode: {
    heading: "Mode A: Local-Only Usage",
    points: [
      "Zero Personal Information Collected: No email address, IP tracking, analytics cookies, or account credentials are required or gathered.",
      "Local Browser Boundary: All data operations remain localized within your Web Crypto API and local storage engine."
    ]
  },
  syncMode: {
    heading: "Mode B: Signed-In Cloud Usage",
    points: [
      "Authentication Data: We collect only your email address and an automatically assigned UID for authentication and database separation.",
      "No Display Name or Profile Picture: Even when signing in via Google, we do not store or display your Google profile photo or full name.",
      "Encrypted Payloads Only: Firestore documents contain only encrypted binary ciphertexts, nonces, and unreadable timestamps.",
      "Data Deletion: You can delete all your cloud documents and delete your account anytime via Backup & Data Settings."
    ]
  },
  contact: "Privacy inquiries: privacy@littlepages.app"
};

export const TERMS_TEXT: LegalPageContent = {
  title: "Terms of Use",
  lastUpdated: LAST_UPDATED,
  summary: "By using Little Pages, you agree to these simple terms governing local storage and cloud sync services.",
  localMode: {
    heading: "Local-Only Usage Terms",
    points: [
      "User Control & Backup Responsibility: You are sole owner and custodian of your local storage data. You are responsible for keeping local backups and saving your emergency recovery key.",
      "Service As-Is: Little Pages is provided 'as is' without warranty of any kind regarding browser storage persistence."
    ]
  },
  syncMode: {
    heading: "Cloud Sync Usage Terms",
    points: [
      "Zero Access Guarantee: You acknowledge that Little Pages staff cannot recover encrypted data if you lose your passphrase and recovery key.",
      "Acceptable Use: You agree not to attempt to reverse engineer or disrupt cloud database access controls.",
      "Account Termination: You may delete your account and all associated Firestore records at any time."
    ]
  },
  contact: "Terms inquiries: legal@littlepages.app"
};
