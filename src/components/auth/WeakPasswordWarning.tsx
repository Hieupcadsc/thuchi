"use client";

import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ChangePasswordModal } from './ChangePasswordModal';
import { useAuthStore } from '@/hooks/useAuth';

// Check if current user has weak password via API
const checkUserPasswordStrength = async (username: string): Promise<boolean> => {
  try {
    // Check localStorage first for immediate feedback
    const passwordStrength = localStorage.getItem(`password_strength_${username}`);
    if (passwordStrength === 'strong') {
      return false; // Password is strong now
    }

    // Check with API
    const response = await fetch(`/api/auth/change-password?username=${encodeURIComponent(username)}`);
    if (!response.ok) {
      throw new Error('Failed to check password strength');
    }

    const data = await response.json();
    return data.hasWeakPassword;
    
  } catch (error) {
    console.error('Error checking password strength:', error);
    
    // Fallback to default logic if API fails
    const weakPasswordUsers = ['admin', 'test', 'demo', 'user'];
    const isLikelyWeak = weakPasswordUsers.some(weak => 
      username.toLowerCase().includes(weak)
    );
    
    return isLikelyWeak || username === 'Minh Hiếu' || username === 'Minh Đan';
  }
};

export function WeakPasswordWarning() {
  const [hasWeakPassword, setHasWeakPassword] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  
  const { currentUser } = useAuthStore();

  useEffect(() => {
    const checkPassword = async () => {
      if (!currentUser || hasChecked) return;

      try {
        const isWeak = await checkUserPasswordStrength(currentUser);
        setHasWeakPassword(isWeak);
        
        // Auto-show modal if password is weak
        if (isWeak) {
          setShowChangePasswordModal(true);
        }
        
        setHasChecked(true);
      } catch (error) {
        console.error('Error checking password strength:', error);
        setHasChecked(true);
      }
    };

    checkPassword();
  }, [currentUser, hasChecked]);

  const handlePasswordChanged = () => {
    // Update localStorage - password will be saved by ChangePasswordModal
    if (currentUser) {
      localStorage.setItem(`password_strength_${currentUser}`, 'strong');
      localStorage.setItem(`password_changed_${currentUser}`, Date.now().toString());
    }
    
    // Update local state
    setHasWeakPassword(false);
    setShowChangePasswordModal(false);
  };

  const handleModalClose = () => {
    // For forced password change, don't allow closing
    if (hasWeakPassword) {
      // Show warning that they must change password
      alert('⚠️ Bạn phải đổi mật khẩu để tiếp tục sử dụng hệ thống!');
      return;
    }
    
    setShowChangePasswordModal(false);
  };

  // Don't render anything if no weak password or not checked yet
  if (!hasWeakPassword || !hasChecked) {
    return null;
  }

  return (
    <>
      {/* Change Password Modal - No banner to avoid layout conflicts */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={handleModalClose}
        isForced={hasWeakPassword}
        onPasswordChanged={handlePasswordChanged}
      />
    </>
  );
} 