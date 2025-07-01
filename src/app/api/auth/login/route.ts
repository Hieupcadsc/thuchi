import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/sqlite';
import crypto from 'crypto';

function verifyPassword(password: string, storedPassword: string): boolean {
  const [salt, hash] = storedPassword.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Check if user exists in database
    const getUserStmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = getUserStmt.get(username) as any;

    if (user) {
      // User exists in database, verify hashed password
      const isPasswordValid = verifyPassword(password, user.password);
      
      if (isPasswordValid) {
        return NextResponse.json({
          success: true,
          user: {
            username: user.username,
            familyId: user.familyId,
            passwordStrength: user.passwordStrength
          }
        });
      } else {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 401 }
        );
      }
    } else {
      // User not in database, check default password
      const defaultPassword = '123456';
      if (password === defaultPassword) {
        return NextResponse.json({
          success: true,
          user: {
            username,
            familyId: 1, // Default family ID
            passwordStrength: 'weak'
          },
          isDefaultPassword: true
        });
      } else {
        return NextResponse.json(
          { error: 'Invalid username or password' },
          { status: 401 }
        );
      }
    }

  } catch (error) {
    console.error('Error during login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 