/**
 * GET /api/migrate-users
 * Seeds the 2 family users (Minh Hiếu, Minh Đan) into Neon with existing password hashes.
 * Run once after deployment.
 */
import { NextResponse } from 'next/server';
import { query } from '@/lib/neon';

const USERS = [
  {
    username: 'Minh Hiếu',
    password: '18142127ab1e422bf38860ad20968c25:56315917f28a0fb476494d830d3c6d7c2b11a19989bc9c5432ec167a3415a8fd15cf05d733bf8f5699a482d8090c4f34488c01c570dff73e37d14cedb1a012e3',
    familyId: 1,
    passwordStrength: 'strong',
    passwordChangedAt: '2025-07-01T12:59:48.912Z',
    createdAt: '2025-07-01T12:59:48.912Z',
    updatedAt: '2025-07-01T12:59:48.912Z',
  },
  {
    username: 'Minh Đan',
    password: '12f26338392be85aab7f4dab43107417:1b920ff63df8000a320b33de6363095b02ff77f59872ac47a265aac8d57db7856e5a63bab34e9d83f11a612a23e24446e58c1aed5e0ee5fa50671366078c3f8f',
    familyId: 1,
    passwordStrength: 'strong',
    passwordChangedAt: '2025-07-03T12:43:21.803Z',
    createdAt: '2025-07-03T12:43:00.543Z',
    updatedAt: '2025-07-03T12:43:21.803Z',
  },
];

export async function GET() {
  try {
    for (const u of USERS) {
      await query(
        `INSERT INTO users (username, password, "familyId", "passwordStrength", "passwordChangedAt", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (username) DO UPDATE SET
           password = EXCLUDED.password,
           "passwordStrength" = EXCLUDED."passwordStrength",
           "updatedAt" = EXCLUDED."updatedAt"`,
        [u.username, u.password, u.familyId, u.passwordStrength,
         u.passwordChangedAt, u.createdAt, u.updatedAt]
      );
    }

    const result = await query('SELECT username, "passwordStrength", "createdAt" FROM users ORDER BY id');
    return NextResponse.json({
      success: true,
      message: 'Users migrated to Neon successfully',
      users: result.rows,
    });
  } catch (error) {
    console.error('migrate-users error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
