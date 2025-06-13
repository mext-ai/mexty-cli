import chalk from 'chalk';
import { apiClient } from './api';

export function checkAuthentication(): boolean {
  if (!apiClient.isAuthenticated()) {
    console.error(chalk.red('❌ Authentication required'));
    console.log(chalk.yellow('   Please login first: mexty login'));
    return false;
  }
  return true;
}

export function getAuthenticatedUser(): any {
  return apiClient.getStoredUser();
}

export function requireAuthentication(): void {
  if (!checkAuthentication()) {
    process.exit(1);
  }
} 