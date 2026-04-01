import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/neon';
import crypto from 'crypto';
import { DEMO_USER } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const { username, currentPassword, newPassword } = await request.json();

    if (!username || !currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (username === DEMO_USER) {
      return NextResponse.json({ error: 'Demo user cannot change password' }, { status: 403 });
    }

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: 'Password does not meet security requirements', details: passwordValidation.errors },
        { status: 400 }
      );
    }

    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    let user = result.rows[0];
    const now = new Date().toISOString();

    if (!user) {
      if (currentPassword !== '123456') {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
      }
      const hashedPassword = hashPassword(newPassword);
      await query(
        `INSERT INTO users (username, password, "familyId", "passwordStrength", "passwordChangedAt", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [username, hashedPassword, 1, 'strong', now, now, now]
      );
      return NextResponse.json({ success: true, message: 'Password created successfully', passwordStrength: 'strong' });
    }

    const isCurrentPasswordValid = verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    const hashedNewPassword = hashPassword(newPassword);
    await query(
      `UPDATE users SET password=$1, "passwordStrength"=$2, "passwordChangedAt"=$3, "updatedAt"=$4 WHERE username=$5`,
      [hashedNewPassword, 'strong', now, now, username]
    );

    return NextResponse.json({ success: true, message: 'Password updated successfully', passwordStrength: 'strong' });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    if (username === DEMO_USER) {
      return NextResponse.json({ hasWeakPassword: false, passwordStrength: 'demo', isDefaultPassword: false, isDemoUser: true });
    }

    const result = await query(
      'SELECT username, "passwordStrength", "passwordChangedAt" FROM users WHERE username = $1',
      [username]
    );
    const user = result.rows[0];

    if (!user) {
      return NextResponse.json({ hasWeakPassword: true, passwordStrength: 'weak', isDefaultPassword: true });
    }

    return NextResponse.json({
      hasWeakPassword: user.passwordStrength === 'weak',
      passwordStrength: user.passwordStrength,
      isDefaultPassword: false,
      lastChanged: user.passwordChangedAt
    });
  } catch (error) {
    console.error('Error checking password strength:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedPassword: string): boolean {
  const [salt, hash] = storedPassword.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

function validatePassword(password: string) {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  const score = Object.values(checks).filter(Boolean).length;
  const isWeak = ['123456', 'password', '12345678'].includes(password);
  const isValid = score >= 4 && !isWeak;
  return {
    isValid, score, isWeak,
    errors: isValid ? [] : [
      !checks.length && 'Password must be at least 8 characters',
      !checks.uppercase && 'Password must contain uppercase letters',
      !checks.lowercase && 'Password must contain lowercase letters',
      !checks.number && 'Password must contain numbers',
      !checks.special && 'Password must contain special characters',
      isWeak && 'Password is too common'
    ].filter(Boolean)
  };
}
