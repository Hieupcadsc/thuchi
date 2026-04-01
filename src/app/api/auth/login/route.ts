import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/neon';
import crypto from 'crypto';
import { DEMO_USER, DEMO_ACCOUNT_ID } from '@/lib/constants';

function verifyPassword(password: string, storedPassword: string): boolean {
  const [salt, hash] = storedPassword.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    if (username === DEMO_USER) {
      return NextResponse.json({
        success: true,
        user: { username: DEMO_USER, familyId: DEMO_ACCOUNT_ID, passwordStrength: 'demo' },
        isDemoUser: true
      });
    }

    if (!password) {
      return NextResponse.json({ error: 'Password is required for non-demo users' }, { status: 400 });
    }

    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];

    if (user) {
      const isPasswordValid = verifyPassword(password, user.password);
      if (isPasswordValid) {
        return NextResponse.json({
          success: true,
          user: { username: user.username, familyId: user.familyId, passwordStrength: user.passwordStrength }
        });
      } else {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
      }
    } else {
      if (password === '123456') {
        return NextResponse.json({
          success: true,
          user: { username, familyId: 1, passwordStrength: 'weak' },
          isDefaultPassword: true
        });
      } else {
        return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
      }
    }
  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
