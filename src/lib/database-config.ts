// Database configuration for different environments
export const DATABASE_CONFIG = {
  // Detect if running on Replit
  isReplit: process.env.REPL_ID !== undefined,
  
  // Detect if running on Vercel
  isVercel: process.env.VERCEL !== undefined,
  
  // Use SQLite for local development, external DB for production
  useExternalDB: process.env.NODE_ENV === 'production' && (
    process.env.REPL_ID !== undefined || 
    process.env.VERCEL !== undefined
  ),
  
  // External database URL (Supabase, PlanetScale, etc.)
  externalDbUrl: process.env.DATABASE_URL,
  
  // Firebase config for Firestore
  useFirestore: process.env.USE_FIRESTORE === 'true',
  
  // Backup strategy
  enableAutoBackup: process.env.ENABLE_AUTO_BACKUP === 'true',
  backupInterval: parseInt(process.env.BACKUP_INTERVAL || '300000'), // 5 minutes default
};

export function shouldUseExternalDB(): boolean {
  return DATABASE_CONFIG.useExternalDB && (
    DATABASE_CONFIG.externalDbUrl || 
    DATABASE_CONFIG.useFirestore
  );
}

export function getEnvironmentInfo() {
  return {
    environment: process.env.NODE_ENV,
    platform: DATABASE_CONFIG.isReplit ? 'replit' : 
              DATABASE_CONFIG.isVercel ? 'vercel' : 'local',
    useExternal: shouldUseExternalDB(),
    hasBackup: DATABASE_CONFIG.enableAutoBackup
  };
} 