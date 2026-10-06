const fs = require('fs');
let content = fs.readFileSync('src/components/FarmerAuthGate.tsx', 'utf8');

// Update phone validation
content = content.replace(
  'if (phoneNumber.trim().length < 10) {',
  'const phoneRegex = /^[6-9]\\d{9}$/;\n    if (!phoneRegex.test(phoneNumber.trim())) {'
);

// We need to add the import for signInWithGoogle if not present.
if (!content.includes('signInWithGoogle')) {
  content = content.replace(
    'import { signInWithSupabaseEmail } from "../lib/supabase";',
    'import { signInWithSupabaseEmail } from "../lib/supabase";\nimport { signInWithGoogle } from "../lib/firebase";'
  );
}

// Check if signInWithGoogle is imported, if no import at all we can add it to the top.
if (!content.includes('import { signInWithGoogle } from "../lib/firebase";')) {
  content = content.replace(
    'import React, { useState } from "react";',
    'import React, { useState } from "react";\nimport { signInWithGoogle } from "../lib/firebase";'
  );
}

// Add handleGoogleAuth logic
const handleGoogleAuthCode = `
  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMsg("");

    try {
      const fbUser = await signInWithGoogle();
      if (!fbUser) {
        setIsLoading(false);
        setErrorMsg("Google Sign-In failed or was cancelled.");
        return;
      }
      
      const userProfile: UserProfile = {
        id: fbUser.id,
        name: fbUser.name,
        phoneOrEmail: fbUser.phoneOrEmail,
        loginType: "google",
        isLoggedIn: true,
        location: farmLocation.trim() || "India (Field Worker)",
        language: language,
        termsAccepted: true,
        primaryCrop: primaryCrop || "Tomato",
        landSize: landCategory || "2 Acres",
      };

      const res = await fetch("/api/auth/register-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userProfile),
      });

      if (!res.ok) {
        throw new Error("Failed to sync Google profile with server");
      }

      onLoginSuccess(userProfile);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Google authentication failed.");
    } finally {
      setIsLoading(false);
    }
  };
`;

if (!content.includes('const handleGoogleAuth =')) {
  content = content.replace(
    'const handleRegisterAndSubmit = async',
    handleGoogleAuthCode + '\\n  const handleRegisterAndSubmit = async'
  );
}

// UI: add a "Continue with Google" button. I'll add it to both Phone and Email flows or right above the tabs.
// Let's add it in the tabs section or inside the form.
const googleBtn = `
          {/* Google Auth Option */}
          <div className="pt-2 pb-1 border-b border-stone-200 dark:border-zinc-700/50 mb-3">
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-white dark:bg-zinc-800 border-2 border-stone-200 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-700/80 disabled:opacity-50 text-stone-700 dark:text-zinc-200 font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0112 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.27 0 3.198 2.698 1.24 6.65l4.026 3.115z"/>
                <path fill="#34A853" d="M16.04 18.013c-1.09.703-2.474 1.078-4.04 1.078a7.077 7.077 0 01-6.723-4.806L1.24 17.35C3.198 21.302 7.27 24 12 24c2.933 0 5.735-1.043 7.834-3.001l-3.794-2.986z"/>
                <path fill="#4A90E2" d="M19.834 20.999C22.214 18.56 24 15.116 24 12c0-.709-.064-1.403-.173-2.073H12v4.146h6.812c-.296 1.458-1.127 2.673-2.316 3.44l3.338 3.486z"/>
                <path fill="#FBBC05" d="M5.277 14.268A7.12 7.12 0 014.909 12c0-.782.125-1.533.357-2.235L1.24 6.65A11.934 11.934 0 000 12c0 1.92.445 3.73 1.237 5.335l4.04-3.067z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
            <div className="flex items-center justify-center gap-2 mt-3 mb-1 opacity-60">
              <div className="h-px w-12 bg-stone-400"></div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600 dark:text-zinc-400">OR</span>
              <div className="h-px w-12 bg-stone-400"></div>
            </div>
          </div>
`;

content = content.replace(
  '          {/* Method Toggles */}',
  googleBtn + '\\n          {/* Method Toggles */}'
);

fs.writeFileSync('src/components/FarmerAuthGate.tsx', content);
