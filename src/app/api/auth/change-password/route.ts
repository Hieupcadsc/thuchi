import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/sqlite';
import crypto from 'crypto';
import { DEMO_USER } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const { username, currentPassword, newPassword } = await request.json();

    if (!username || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Block password change for Demo user
    if (username === DEMO_USER) {
      return NextResponse.json(
        { error: 'Demo user cannot change password' },
        { status: 403 }
      );
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: 'Password does not meet security requirements', details: passwordValidation.errors },
        { status: 400 }
      );
    }

    // Check if user exists
    const getUserStmt = db.prepare('SELECT * FROM users WHERE username = ?');
    let user = getUserStmt.get(username) as any;

    // If user doesn't exist, create with default password check
    if (!user) {
      const defaultPassword = '123456';
      if (currentPassword !== defaultPassword) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 401 }
        );
      }

      // Create new user with hashed password
      const hashedPassword = hashPassword(newPassword);
      const createUserStmt = db.prepare(`
        INSERT INTO users (username, password, familyId, passwordStrength, passwordChangedAt, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const now = new Date().toISOString();
      createUserStmt.run(
        username,
        hashedPassword,
        1, // Default family ID
        'strong',
        now,
        now,
        now
      );

      return NextResponse.json({
        success: true,
        message: 'Password created successfully',
        passwordStrength: 'strong'
      });
    }

    // User exists, verify current password
    const isCurrentPasswordValid = verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Update password
    const hashedNewPassword = hashPassword(newPassword);
    const updateUserStmt = db.prepare(`
      UPDATE users 
      SET password = ?, passwordStrength = ?, passwordChangedAt = ?, updatedAt = ?
      WHERE username = ?
    `);

    const now = new Date().toISOString();
    updateUserStmt.run(
      hashedNewPassword,
      'strong',
      now,
      now,
      username
    );

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
      passwordStrength: 'strong'
    });

  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Skip password check for Demo user
    if (username === DEMO_USER) {
      return NextResponse.json({
        hasWeakPassword: false,
        passwordStrength: 'demo',
        isDefaultPassword: false,
        isDemoUser: true
      });
    }

    const getUserStmt = db.prepare('SELECT username, passwordStrength, passwordChangedAt FROM users WHERE username = ?');
    const user = getUserStmt.get(username) as any;

    if (!user) {
      // User not in database = using default password
      return NextResponse.json({
        hasWeakPassword: true,
        passwordStrength: 'weak',
        isDefaultPassword: true
      });
    }

    return NextResponse.json({
      hasWeakPassword: user.passwordStrength === 'weak',
      passwordStrength: user.passwordStrength,
      isDefaultPassword: false,
      lastChanged: user.passwordChangedAt
    });

  } catch (error) {
    console.error('Error checking password strength:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
  const isWeak = password === '123456' || password === 'password' || password === '12345678';
  const isValid = score >= 4 && !isWeak;

  return {
    isValid,
    score,
    isWeak,
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