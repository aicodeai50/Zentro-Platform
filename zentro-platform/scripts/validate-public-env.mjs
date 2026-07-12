const requiredPublicVariables = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_ZENTRO_API_URL",
  "NEXT_PUBLIC_SITE_URL",
];

let hasMissingVariable = false;

for (const variableName of requiredPublicVariables) {
  const present = Boolean(process.env[variableName]);
  console.log(`${variableName} present: ${present}`);

  if (!present) {
    hasMissingVariable = true;
  }
}

if (hasMissingVariable) {
  console.error("Required public environment variables are missing.");
  process.exit(1);
}
