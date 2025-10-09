"use client";

import { useEffect, useState } from "react";

const EnvironmentCheck = () => {
  const [envStatus, setEnvStatus] = useState({
    supabaseUrl: false,
    supabaseKey: false,
  });

  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    setEnvStatus({
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey,
    });
  }, []);

  if (envStatus.supabaseUrl && envStatus.supabaseKey) {
    return null; // Don't show anything if everything is configured
  }

  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      <h3 className="font-bold">Environment Configuration Issue</h3>
      <ul className="list-disc list-inside">
        {!envStatus.supabaseUrl && <li>NEXT_PUBLIC_SUPABASE_URL is missing</li>}
        {!envStatus.supabaseKey && <li>NEXT_PUBLIC_SUPABASE_ANON_KEY is missing</li>}
      </ul>
      <p className="mt-2 text-sm">
        Please create a <code>.env.local</code> file with these variables.
      </p>
    </div>
  );
};

export default EnvironmentCheck;
