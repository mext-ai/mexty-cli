import chalk from 'chalk';
import { createInterface } from 'readline';
import { apiClient } from '../utils/api';

// Simple prompt function
async function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Wait function for countdown
async function wait(seconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

export async function loginCommand(): Promise<void> {
  try {
    console.log(chalk.blue('🔐 Login to MEXT'));

    // Check if already authenticated
    if (apiClient.isAuthenticated()) {
      const user = apiClient.getStoredUser();
      console.log(chalk.green('✅ You are already logged in!'));
      console.log(chalk.gray(`   Email: ${user?.email || 'Unknown'}`));
      console.log(chalk.gray(`   Name: ${user?.fullName || 'Not set'}`));
      
      const logout = await prompt('Do you want to logout and login as a different user? (y/N): ');
      if (logout.toLowerCase() !== 'y' && logout.toLowerCase() !== 'yes') {
        return;
      }
      
      await apiClient.logout();
      console.log(chalk.yellow('📤 Logged out successfully'));
    }

    // Request email
    const email = await prompt('Enter your email address: ');
    
    if (!email || !email.includes('@')) {
      console.error(chalk.red('❌ Please provide a valid email address'));
      process.exit(1);
    }

    console.log(chalk.yellow('📧 Requesting verification code...'));

    // Request OTP
    try {
      const otpResponse = await apiClient.requestOTP(email);
      
      if (!otpResponse.success) {
        console.error(chalk.red(`❌ ${otpResponse.message}`));
        process.exit(1);
      }

      console.log(chalk.green('✅ Verification code sent to your email'));
      console.log(chalk.gray('   Please check your inbox (and spam folder)'));
      
      // Wait a moment for the user to check email
      await wait(2);
      
      // Request OTP code
      const otp = await prompt('Enter the 6-digit verification code: ');
      
      if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
        console.error(chalk.red('❌ Please provide a valid 6-digit code'));
        process.exit(1);
      }

      console.log(chalk.yellow('🔓 Verifying code...'));

      // Verify OTP
      const verifyResponse = await apiClient.verifyOTP(email, otp);
      
      if (!verifyResponse.success) {
        console.error(chalk.red(`❌ ${verifyResponse.message}`));
        process.exit(1);
      }

      console.log(chalk.green('🎉 Login successful!'));
      console.log(chalk.gray(`   Welcome, ${verifyResponse.user?.fullName || verifyResponse.user?.email || 'User'}!`));
      
      if (!verifyResponse.user?.isProfileComplete) {
        console.log(chalk.yellow('⚠️  Your profile is incomplete. Please complete it in the web interface.'));
      }

    } catch (error: any) {
      console.error(chalk.red(`❌ Login failed: ${error.message}`));
      process.exit(1);
    }

  } catch (error: any) {
    console.error(chalk.red(`❌ Login error: ${error.message}`));
    process.exit(1);
  }
} 